import assert from "node:assert/strict";
import test from "node:test";
import type pg from "pg";
import { createPostgresPool, withPostgresTransaction } from "./postgresAdapter.js";
import { createPostgresRepositories } from "./postgresRepositories.js";

class MockDb {
  public readonly queries: Array<{ sql: string; values?: unknown[] }> = [];

  async query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }> {
    this.queries.push({ sql, values });

    if (sql.includes("FROM customers")) {
      return {
        rows: [
          {
            id: "cus_pg",
            first_name: "Adaeze",
            last_name: "Okafor",
            phone: "+2348012345678",
            email: "adaeze@example.com",
            kyc_tier: "tier_2",
            kyc_status: "approved",
            bvn_last4: "4821",
            nin_last4: "1742",
            created_at: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
      };
    }

    if (sql.includes("FROM customer_users")) {
      return {
        rows: [
          {
            id: "cu_pg",
            customer_id: "cus_pg",
            email: "adaeze@example.com",
            password_hash: "hash",
            phone: "+2348012345678",
            active: true,
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      };
    }

    if (sql.includes("FROM accounts")) {
      return {
        rows: [
          {
            id: "acct_pg",
            customer_id: "cus_pg",
            account_number: "1023456789",
            account_name: "Adaeze Okafor",
            currency: "NGN",
            balance_kobo: "245000000",
            available_balance_kobo: "245000000",
            status: "active",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      };
    }

    if (sql.includes("FROM ledger_entries")) {
      return {
        rows: [
          {
            id: "led_pg",
            transaction_id: "seed_opening_balance",
            account_id: "acct_pg",
            entry_type: "credit",
            amount_kobo: "245000000",
            balance_after_kobo: "245000000",
            narration: "Opening balance",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      };
    }

    if (sql.includes("INSERT INTO beneficiaries") || sql.includes("UPDATE beneficiaries")) {
      return {
        rows: [
          {
            id: "ben_pg",
            customer_id: "cus_pg",
            name: "Chinedu Okeke",
            account_number: "0123456789",
            bank_code: "000027",
            bank_name: "Standard Chartered Bank Nigeria",
            status: sql.includes("UPDATE beneficiaries") ? "disabled" : "active",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      };
    }

    if (sql.includes("FROM beneficiaries")) {
      return { rows: [] };
    }

    if (sql.includes("INSERT INTO transfers") || sql.includes("FROM transfers")) {
      return {
        rows: [
          {
            id: "trf_pg",
            customer_id: "cus_pg",
            source_account_id: "acct_pg",
            amount_kobo: "100000",
            beneficiary_name: "Chinedu Okeke",
            beneficiary_account_number: "0123456789",
            beneficiary_bank_code: "000027",
            narration: "Postgres repository test",
            channel: "nip_mock",
            idempotency_key: "pg-key-001",
            customer_device_id: "dev_pg",
            otp_challenge_id: "otp_pg",
            status: "successful",
            reference: "OBNGPG001",
            risk_score: 0,
            risk_level: "low",
            risk_reasons: [],
            failure_reason: null,
            created_at: "2026-01-01T00:00:00.000Z",
            completed_at: "2026-01-01T00:00:01.000Z",
            reversed_at: null,
            reversal_reason: null,
            reviewed_by: null,
            reviewed_at: null,
          },
        ],
      };
    }

    return { rows: [] };
  }
}

test("maps PostgreSQL customers, accounts, ledger statements, beneficiaries, and transfers", async () => {
  const db = new MockDb();
  const repositories = createPostgresRepositories(db);

  const customer = await repositories.customers.findCustomerById("cus_pg");
  const user = await repositories.customers.findCustomerUserByEmail("adaeze@example.com");
  const accounts = await repositories.accounts.listCustomerAccounts("cus_pg");
  const statement = await repositories.ledger.buildStatement("acct_pg", new Date("2026-01-01"), new Date("2026-12-31"));
  const beneficiary = await repositories.beneficiaries.create({
    id: "ben_pg",
    customerId: "cus_pg",
    name: "Chinedu Okeke",
    accountNumber: "0123456789",
    bankCode: "000027",
    bankName: "",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  const disabledBeneficiary = await repositories.beneficiaries.disable("cus_pg", "ben_pg");
  const transfer = await repositories.transfers.save({
    id: "trf_pg",
    customerId: "cus_pg",
    sourceAccountId: "acct_pg",
    amountKobo: 100_000,
    beneficiaryName: "Chinedu Okeke",
    beneficiaryAccountNumber: "0123456789",
    beneficiaryBankCode: "000027",
    narration: "Postgres repository test",
    channel: "nip_mock",
    idempotencyKey: "pg-key-001",
    customerDeviceId: "dev_pg",
    otpChallengeId: "otp_pg",
    status: "successful",
    reference: "OBNGPG001",
    riskScore: 0,
    riskLevel: "low",
    riskReasons: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    completedAt: "2026-01-01T00:00:01.000Z",
  });

  assert.equal(customer?.id, "cus_pg");
  assert.equal(user?.customerId, "cus_pg");
  assert.equal(accounts[0].balanceKobo, 245_000_000);
  assert.equal(statement.totalCreditsKobo, 245_000_000);
  assert.equal(beneficiary.bankName, "Standard Chartered Bank Nigeria");
  assert.equal(disabledBeneficiary.status, "disabled");
  assert.equal(transfer.customerId, "cus_pg");
  assert.ok(db.queries.some((entry) => entry.sql.includes("ON CONFLICT (id) DO UPDATE")));
});

test("runs PostgreSQL transaction integration smoke when explicitly enabled", { skip: process.env.ZEBEPAY_RUN_POSTGRES_TESTS !== "true" }, async () => {
  const pool = createPostgresPool();

  try {
    const result = await withPostgresTransaction(pool, async (client) => {
      const queryResult = await client.query("SELECT 1::int AS ok");
      return queryResult.rows[0] as { ok: number };
    });

    assert.equal(result.ok, 1);
  } finally {
    await (pool as pg.Pool).end();
  }
});
