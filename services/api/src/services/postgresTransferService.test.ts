import assert from "node:assert/strict";
import test from "node:test";
import { createPostgresTransferInsideTransaction } from "./postgresTransferService.js";

class MockTransferDb {
  public readonly queries: Array<{ sql: string; values?: readonly unknown[] }> = [];

  constructor(private readonly options: { trustedDevice: boolean; verifiedOtp: boolean; dailyPostedKobo?: number }) {}

  async query(sql: string, values?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }> {
    this.queries.push({ sql, values });

    if (sql.includes("FROM idempotency_keys")) {
      return { rows: [] };
    }

    if (sql.includes("FROM accounts a")) {
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
            kyc_tier: "tier_2",
          },
        ],
      };
    }

    if (sql.includes("FROM customer_devices")) {
      return { rows: this.options.trustedDevice ? [{ id: "dev_pg" }] : [] };
    }

    if (sql.includes("FROM otp_challenges")) {
      return { rows: this.options.verifiedOtp ? [{ id: "otp_pg" }] : [] };
    }

    if (sql.includes("COALESCE(SUM(amount_kobo), 0)")) {
      return { rows: [{ total_kobo: this.options.dailyPostedKobo ?? 0 }] };
    }

    if (sql.includes("FROM transfers") && sql.includes("recent")) {
      return { rows: [] };
    }

    if (sql.includes("INSERT INTO transfers")) {
      const riskReasons = typeof values?.[16] === "string" ? JSON.parse(values[16]) : [];
      return {
        rows: [
          {
            id: values?.[0],
            customer_id: "cus_pg",
            source_account_id: "acct_pg",
            amount_kobo: values?.[3],
            beneficiary_name: "Chinedu Okeke",
            beneficiary_account_number: "0123456789",
            beneficiary_bank_code: "000027",
            narration: "Postgres transfer service test",
            channel: "nip_mock",
            idempotency_key: "pg-transfer-service-key",
            customer_device_id: "dev_pg",
            otp_challenge_id: "otp_pg",
            status: values?.[12],
            reference: values?.[13],
            risk_score: values?.[14],
            risk_level: values?.[15],
            risk_reasons: riskReasons,
            failure_reason: values?.[17],
            created_at: values?.[18],
            completed_at: values?.[19],
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

const instruction = {
  customerId: "cus_pg",
  sourceAccountId: "acct_pg",
  amountKobo: 100_000,
  beneficiaryName: "Chinedu Okeke",
  beneficiaryAccountNumber: "0123456789",
  beneficiaryBankCode: "000027",
  narration: "Postgres transfer service test",
  channel: "nip_mock" as const,
  idempotencyKey: "pg-transfer-service-key",
  customerDeviceId: "dev_pg",
  otpChallengeId: "otp_pg",
};

test("creates a successful PostgreSQL transfer inside one transaction boundary", async () => {
  const db = new MockTransferDb({ trustedDevice: true, verifiedOtp: true });
  const transfer = await createPostgresTransferInsideTransaction(db, instruction);
  const sql = db.queries.map((entry) => entry.sql);

  assert.equal(transfer.status, "successful");
  assert.ok(sql.some((entry) => entry.includes("UPDATE accounts SET balance_kobo")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO ledger_entries")));
  assert.ok(sql.some((entry) => entry.includes("UPDATE otp_challenges SET consumed_at")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO transfers")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO idempotency_keys")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO audit_events")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO notifications")));
});

test("holds PostgreSQL transfer when cumulative same-day KYC exposure is exceeded", async () => {
  const db = new MockTransferDb({ trustedDevice: true, verifiedOtp: true, dailyPostedKobo: 4_950_000 });
  const transfer = await createPostgresTransferInsideTransaction(db, { ...instruction, amountKobo: 100_000 });
  const sql = db.queries.map((entry) => entry.sql);

  assert.equal(transfer.status, "requires_review");
  assert.equal(transfer.failureReason, "Transfer would exceed the customer's remaining KYC tier daily limit.");
  assert.deepEqual(transfer.riskReasons, ["daily_kyc_limit_exceeded"]);
  assert.ok(sql.some((entry) => entry.includes("COALESCE(SUM(amount_kobo), 0)")));
  assert.equal(sql.some((entry) => entry.includes("UPDATE accounts SET balance_kobo")), false);
  assert.equal(sql.some((entry) => entry.includes("INSERT INTO ledger_entries")), false);
});

test("holds PostgreSQL transfer for review without debiting when risk controls fail", async () => {
  const db = new MockTransferDb({ trustedDevice: false, verifiedOtp: false });
  const transfer = await createPostgresTransferInsideTransaction(db, instruction);
  const sql = db.queries.map((entry) => entry.sql);

  assert.equal(transfer.status, "requires_review");
  assert.ok(transfer.riskReasons.includes("untrusted_device"));
  assert.ok(transfer.riskReasons.includes("otp_not_verified"));
  assert.equal(sql.some((entry) => entry.includes("UPDATE accounts SET balance_kobo")), false);
  assert.equal(sql.some((entry) => entry.includes("INSERT INTO ledger_entries")), false);
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO transfers")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO audit_events")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO notifications")));
});
