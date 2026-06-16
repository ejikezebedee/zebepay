import type {
  AccountStatement,
  BankAccount,
  Beneficiary,
  CustomerProfile,
  CustomerUser,
  LedgerEntry,
  TransferRecord,
} from "@zebepay/shared";
import { findNigerianBank } from "@zebepay/shared";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import type {
  AsyncAccountRepository,
  AsyncBeneficiaryRepository,
  AsyncCustomerRepository,
  AsyncLedgerRepository,
  AsyncTransferRepository,
  AsyncUnitOfWork,
} from "./contracts.js";
import { withPostgresTransaction } from "./postgresAdapter.js";

type Row = Record<string, unknown>;

export interface PostgresQueryable {
  query(sql: string, values?: readonly unknown[]): Promise<{ rows: Row[] }>;
}

export interface PostgresRepositorySet {
  customers: AsyncCustomerRepository;
  accounts: AsyncAccountRepository;
  beneficiaries: AsyncBeneficiaryRepository;
  ledger: AsyncLedgerRepository;
  transfers: AsyncTransferRepository;
}

function toIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function mapCustomer(row: Row): CustomerProfile {
  return {
    id: String(row.id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    phone: String(row.phone),
    email: String(row.email),
    kycTier: row.kyc_tier as CustomerProfile["kycTier"],
    kycStatus: row.kyc_status as CustomerProfile["kycStatus"],
    bvnLast4: row.bvn_last4 ? String(row.bvn_last4) : undefined,
    ninLast4: row.nin_last4 ? String(row.nin_last4) : undefined,
    createdAt: toIso(row.created_at),
  };
}

function mapCustomerUser(row: Row): CustomerUser {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    phone: String(row.phone),
    active: Boolean(row.active),
    createdAt: toIso(row.created_at),
  };
}

function mapAccount(row: Row): BankAccount {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    accountNumber: String(row.account_number),
    accountName: String(row.account_name),
    currency: "NGN",
    balanceKobo: toNumber(row.balance_kobo),
    availableBalanceKobo: toNumber(row.available_balance_kobo),
    status: row.status as BankAccount["status"],
    createdAt: toIso(row.created_at),
  };
}

function mapBeneficiary(row: Row): Beneficiary {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    name: String(row.name),
    accountNumber: String(row.account_number),
    bankCode: String(row.bank_code),
    bankName: String(row.bank_name),
    status: row.status as Beneficiary["status"],
    createdAt: toIso(row.created_at),
  };
}

function mapLedgerEntry(row: Row): LedgerEntry {
  return {
    id: String(row.id),
    transactionId: String(row.transaction_id),
    accountId: String(row.account_id),
    entryType: row.entry_type as LedgerEntry["entryType"],
    amountKobo: toNumber(row.amount_kobo),
    balanceAfterKobo: toNumber(row.balance_after_kobo),
    narration: String(row.narration),
    createdAt: toIso(row.created_at),
  };
}

export function mapTransfer(row: Row): TransferRecord {
  const riskReasons = Array.isArray(row.risk_reasons) ? row.risk_reasons.map(String) : [];

  return {
    id: String(row.id),
    customerId: row.customer_id ? String(row.customer_id) : undefined,
    sourceAccountId: String(row.source_account_id),
    amountKobo: toNumber(row.amount_kobo),
    beneficiaryName: String(row.beneficiary_name),
    beneficiaryAccountNumber: String(row.beneficiary_account_number),
    beneficiaryBankCode: String(row.beneficiary_bank_code),
    narration: String(row.narration),
    channel: row.channel as TransferRecord["channel"],
    idempotencyKey: String(row.idempotency_key),
    customerDeviceId: row.customer_device_id ? String(row.customer_device_id) : undefined,
    otpChallengeId: row.otp_challenge_id ? String(row.otp_challenge_id) : undefined,
    status: row.status as TransferRecord["status"],
    reference: String(row.reference),
    riskScore: toNumber(row.risk_score),
    riskLevel: row.risk_level as TransferRecord["riskLevel"],
    riskReasons,
    failureReason: row.failure_reason ? String(row.failure_reason) : undefined,
    createdAt: toIso(row.created_at),
    completedAt: row.completed_at ? toIso(row.completed_at) : undefined,
    reversedAt: row.reversed_at ? toIso(row.reversed_at) : undefined,
    reversalReason: row.reversal_reason ? String(row.reversal_reason) : undefined,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : undefined,
    reviewedAt: row.reviewed_at ? toIso(row.reviewed_at) : undefined,
  };
}

export function createPostgresRepositories(db: PostgresQueryable): PostgresRepositorySet {
  const accounts: AsyncAccountRepository = {
    async findAccountById(accountId) {
      const result = await db.query("SELECT * FROM accounts WHERE id = $1 LIMIT 1", [accountId]);
      return result.rows[0] ? mapAccount(result.rows[0]) : undefined;
    },
    async listCustomerAccounts(customerId) {
      const result = await db.query("SELECT * FROM accounts WHERE customer_id = $1 ORDER BY created_at DESC", [customerId]);
      return result.rows.map(mapAccount);
    },
  };

  const ledger: AsyncLedgerRepository = {
    async listAccountEntries(accountId) {
      const result = await db.query("SELECT * FROM ledger_entries WHERE account_id = $1 ORDER BY created_at DESC", [accountId]);
      return result.rows.map(mapLedgerEntry);
    },
    async buildStatement(accountId, from, to): Promise<AccountStatement> {
      const account = await accounts.findAccountById(accountId);

      if (!account) {
        throw new Error("Account was not found.");
      }

      const result = await db.query(
        "SELECT * FROM ledger_entries WHERE account_id = $1 AND created_at >= $2 AND created_at <= $3 ORDER BY created_at ASC",
        [accountId, from, to],
      );
      const entries = result.rows.map(mapLedgerEntry);
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

  return {
    customers: {
      async findCustomerById(customerId) {
        const result = await db.query("SELECT * FROM customers WHERE id = $1 LIMIT 1", [customerId]);
        return result.rows[0] ? mapCustomer(result.rows[0]) : undefined;
      },
      async findCustomerUserByEmail(email) {
        const result = await db.query("SELECT * FROM customer_users WHERE email = $1 AND active = true LIMIT 1", [email]);
        return result.rows[0] ? mapCustomerUser(result.rows[0]) : undefined;
      },
    },
    accounts,
    beneficiaries: {
      async listByCustomer(customerId) {
        const result = await db.query("SELECT * FROM beneficiaries WHERE customer_id = $1 ORDER BY created_at DESC", [customerId]);
        return result.rows.map(mapBeneficiary);
      },
      async create(input) {
        const bank = findNigerianBank(input.bankCode);

        if (!bank) {
          throw new Error("Beneficiary bank code is not supported.");
        }

        const beneficiary: Beneficiary = {
          ...input,
          id: input.id || `ben_${randomUUID()}`,
          bankName: bank.name,
          status: "active",
          createdAt: input.createdAt || new Date().toISOString(),
        };
        const result = await db.query(
          `INSERT INTO beneficiaries (id, customer_id, name, account_number, bank_code, bank_name, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            beneficiary.id,
            beneficiary.customerId,
            beneficiary.name,
            beneficiary.accountNumber,
            beneficiary.bankCode,
            beneficiary.bankName,
            beneficiary.status,
            beneficiary.createdAt,
          ],
        );

        return mapBeneficiary(result.rows[0]);
      },
      async disable(customerId, beneficiaryId) {
        const result = await db.query(
          `UPDATE beneficiaries
           SET status = 'disabled'
           WHERE id = $1 AND customer_id = $2
           RETURNING *`,
          [beneficiaryId, customerId],
        );

        if (!result.rows[0]) {
          throw new Error("Beneficiary was not found.");
        }

        return mapBeneficiary(result.rows[0]);
      },
    },
    ledger,
    transfers: {
      async findById(transferId) {
        const result = await db.query("SELECT * FROM transfers WHERE id = $1 LIMIT 1", [transferId]);
        return result.rows[0] ? mapTransfer(result.rows[0]) : undefined;
      },
      async listBySourceAccounts(accountIds) {
        if (accountIds.length === 0) {
          return [];
        }

        const result = await db.query("SELECT * FROM transfers WHERE source_account_id = ANY($1::text[]) ORDER BY created_at DESC", [
          accountIds,
        ]);
        return result.rows.map(mapTransfer);
      },
      async save(transfer) {
        const result = await db.query(
          `INSERT INTO transfers (
             id, customer_id, source_account_id, amount_kobo, beneficiary_name, beneficiary_account_number,
             beneficiary_bank_code, narration, channel, idempotency_key, customer_device_id, otp_challenge_id,
             status, reference, risk_score, risk_level, risk_reasons, failure_reason, created_at, completed_at,
             reversed_at, reversal_reason, reviewed_by, reviewed_at
           )
           VALUES (
             $1, $2, $3, $4, $5, $6,
             $7, $8, $9, $10, $11, $12,
             $13, $14, $15, $16, $17::jsonb, $18, $19, $20,
             $21, $22, $23, $24
           )
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status,
             risk_score = EXCLUDED.risk_score,
             risk_level = EXCLUDED.risk_level,
             risk_reasons = EXCLUDED.risk_reasons,
             failure_reason = EXCLUDED.failure_reason,
             completed_at = EXCLUDED.completed_at,
             reversed_at = EXCLUDED.reversed_at,
             reversal_reason = EXCLUDED.reversal_reason,
             reviewed_by = EXCLUDED.reviewed_by,
             reviewed_at = EXCLUDED.reviewed_at
           RETURNING *`,
          [
            transfer.id,
            transfer.customerId ?? null,
            transfer.sourceAccountId,
            transfer.amountKobo,
            transfer.beneficiaryName,
            transfer.beneficiaryAccountNumber,
            transfer.beneficiaryBankCode,
            transfer.narration,
            transfer.channel,
            transfer.idempotencyKey,
            transfer.customerDeviceId ?? null,
            transfer.otpChallengeId ?? null,
            transfer.status,
            transfer.reference,
            transfer.riskScore,
            transfer.riskLevel,
            JSON.stringify(transfer.riskReasons),
            transfer.failureReason ?? null,
            transfer.createdAt,
            transfer.completedAt ?? null,
            transfer.reversedAt ?? null,
            transfer.reversalReason ?? null,
            transfer.reviewedBy ?? null,
            transfer.reviewedAt ?? null,
          ],
        );

        return mapTransfer(result.rows[0]);
      },
    },
  };
}

export function createPostgresUnitOfWork(pool: pg.Pool): AsyncUnitOfWork {
  return {
    async transaction(name, work) {
      return withPostgresTransaction(pool, (client) => work({ id: `${name}_${Date.now()}` }));
    },
  };
}
