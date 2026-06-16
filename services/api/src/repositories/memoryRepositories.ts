import { findNigerianBank, type AccountStatement, type Beneficiary } from "@zebepay/shared";
import { store } from "../data/store.js";
import type {
  AccountRepository,
  BeneficiaryRepository,
  CustomerRepository,
  LedgerRepository,
  TransferRepository,
  UnitOfWork,
} from "./contracts.js";

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const customerRepository: CustomerRepository = {
  findCustomerById(customerId) {
    return store.customers.find((customer) => customer.id === customerId);
  },
  findCustomerUserByEmail(email) {
    return store.customerUsers.find((user) => user.email === email && user.active);
  },
};

export const accountRepository: AccountRepository = {
  findAccountById(accountId) {
    return store.accounts.find((account) => account.id === accountId);
  },
  listCustomerAccounts(customerId) {
    return store.accounts.filter((account) => account.customerId === customerId);
  },
};

export const beneficiaryRepository: BeneficiaryRepository = {
  listByCustomer(customerId) {
    return store.beneficiaries.filter((beneficiary) => beneficiary.customerId === customerId);
  },
  create(input) {
    const bank = findNigerianBank(input.bankCode);

    if (!bank) {
      throw new Error("Beneficiary bank code is not supported.");
    }

    const beneficiary: Beneficiary = {
      ...input,
      id: input.id || makeId("ben"),
      bankName: bank.name,
      status: "active",
      createdAt: input.createdAt || new Date().toISOString(),
    };

    store.beneficiaries.push(beneficiary);
    return beneficiary;
  },
  disable(customerId, beneficiaryId) {
    const beneficiary = store.beneficiaries.find((entry) => entry.id === beneficiaryId && entry.customerId === customerId);

    if (!beneficiary) {
      throw new Error("Beneficiary was not found.");
    }

    beneficiary.status = "disabled";
    return beneficiary;
  },
};

export const ledgerRepository: LedgerRepository = {
  listAccountEntries(accountId) {
    return store.ledgerEntries
      .filter((entry) => entry.accountId === accountId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  buildStatement(accountId, from, to): AccountStatement {
    const account = accountRepository.findAccountById(accountId);

    if (!account) {
      throw new Error("Account was not found.");
    }

    const entries = store.ledgerEntries
      .filter((entry) => {
        const createdAt = new Date(entry.createdAt);
        return entry.accountId === accountId && createdAt >= from && createdAt <= to;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const totalDebitsKobo = entries
      .filter((entry) => entry.entryType === "debit")
      .reduce((sum, entry) => sum + entry.amountKobo, 0);
    const totalCreditsKobo = entries
      .filter((entry) => entry.entryType === "credit")
      .reduce((sum, entry) => sum + entry.amountKobo, 0);
    const openingBalanceKobo = entries[0]?.balanceAfterKobo
      ? entries[0].balanceAfterKobo - (entries[0].entryType === "credit" ? entries[0].amountKobo : -entries[0].amountKobo)
      : account.balanceKobo;

    return {
      accountId: account.id,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      currency: account.currency,
      openingBalanceKobo,
      closingBalanceKobo: account.balanceKobo,
      totalDebitsKobo,
      totalCreditsKobo,
      from: from.toISOString(),
      to: to.toISOString(),
      entries,
      generatedAt: new Date().toISOString(),
    };
  },
};

export const transferRepository: TransferRepository = {
  findById(transferId) {
    return store.transfers.find((transfer) => transfer.id === transferId);
  },
  save(transfer) {
    const index = store.transfers.findIndex((entry) => entry.id === transfer.id);

    if (index >= 0) {
      store.transfers[index] = transfer;
    } else {
      store.transfers.push(transfer);
    }

    return transfer;
  },
};

export const inMemoryUnitOfWork: UnitOfWork = {
  transaction(name, work) {
    const snapshot = {
      accounts: structuredClone(store.accounts),
      ledgerEntries: structuredClone(store.ledgerEntries),
      transfers: structuredClone(store.transfers),
      auditEvents: structuredClone(store.auditEvents),
      beneficiaries: structuredClone(store.beneficiaries),
      customerDevices: structuredClone(store.customerDevices),
      otpChallenges: structuredClone(store.otpChallenges),
      notifications: structuredClone(store.notifications),
      fundingIntents: structuredClone(store.fundingIntents),
      payoutDispatches: structuredClone(store.payoutDispatches),
      idempotencyKeys: new Map(store.idempotencyKeys),
    };

    try {
      return work({ id: `${name}_${Date.now()}` });
    } catch (error) {
      store.accounts = snapshot.accounts;
      store.ledgerEntries = snapshot.ledgerEntries;
      store.transfers = snapshot.transfers;
      store.auditEvents = snapshot.auditEvents;
      store.beneficiaries = snapshot.beneficiaries;
      store.customerDevices = snapshot.customerDevices;
      store.otpChallenges = snapshot.otpChallenges;
      store.notifications = snapshot.notifications;
      store.fundingIntents = snapshot.fundingIntents;
      store.payoutDispatches = snapshot.payoutDispatches;
      store.idempotencyKeys = snapshot.idempotencyKeys;
      throw error;
    }
  },
};
