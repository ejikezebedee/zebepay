import type {
  AsyncAccountRepository,
  AsyncBeneficiaryRepository,
  AsyncCustomerRepository,
  AsyncLedgerRepository,
  AsyncTransferRepository,
} from "./contracts.js";
import {
  accountRepository,
  beneficiaryRepository,
  customerRepository,
  ledgerRepository,
  transferRepository,
} from "./memoryRepositories.js";
import { createPostgresPool } from "./postgresAdapter.js";
import { createPostgresRepositories, type PostgresRepositorySet } from "./postgresRepositories.js";
import { getStorageMode } from "../services/storageReadiness.js";
import { store } from "../data/store.js";

export interface BankingRepositorySet {
  customers: AsyncCustomerRepository;
  accounts: AsyncAccountRepository;
  beneficiaries: AsyncBeneficiaryRepository;
  ledger: AsyncLedgerRepository;
  transfers: AsyncTransferRepository;
  mode: "memory" | "postgres";
}

const memoryRepositories: BankingRepositorySet = {
  customers: {
    async findCustomerById(customerId) {
      return customerRepository.findCustomerById(customerId);
    },
    async findCustomerUserByEmail(email) {
      return customerRepository.findCustomerUserByEmail(email);
    },
  },
  accounts: {
    async findAccountById(accountId) {
      return accountRepository.findAccountById(accountId);
    },
    async listCustomerAccounts(customerId) {
      return accountRepository.listCustomerAccounts(customerId);
    },
  },
  beneficiaries: {
    async listByCustomer(customerId) {
      return beneficiaryRepository.listByCustomer(customerId);
    },
    async create(beneficiary) {
      return beneficiaryRepository.create(beneficiary);
    },
    async disable(customerId, beneficiaryId) {
      return beneficiaryRepository.disable(customerId, beneficiaryId);
    },
  },
  ledger: {
    async listAccountEntries(accountId) {
      return ledgerRepository.listAccountEntries(accountId);
    },
    async buildStatement(accountId, from, to) {
      return ledgerRepository.buildStatement(accountId, from, to);
    },
  },
  transfers: {
    async findById(transferId) {
      return transferRepository.findById(transferId);
    },
    async listBySourceAccounts(accountIds) {
      const accountIdSet = new Set(accountIds);
      return accountIdSet.size === 0 ? [] : store.transfers.filter((transfer) => accountIdSet.has(transfer.sourceAccountId));
    },
    async save(transfer) {
      return transferRepository.save(transfer);
    },
  },
  mode: "memory",
};

let postgresRepositories: (PostgresRepositorySet & { mode: "postgres" }) | undefined;

export function getBankingRepositories(): BankingRepositorySet {
  if (getStorageMode() !== "postgres") {
    return {
      ...memoryRepositories,
      transfers: {
        ...memoryRepositories.transfers,
        async listBySourceAccounts(accountIds) {
          const accountIdSet = new Set(accountIds);
          return accountIdSet.size === 0 ? [] : store.transfers.filter((transfer) => accountIdSet.has(transfer.sourceAccountId));
        },
      },
    };
  }

  if (!postgresRepositories) {
    postgresRepositories = { ...createPostgresRepositories(createPostgresPool()), mode: "postgres" };
  }

  return postgresRepositories;
}
