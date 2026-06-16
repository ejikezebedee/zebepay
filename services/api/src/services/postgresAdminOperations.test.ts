import assert from "node:assert/strict";
import test from "node:test";
import {
  decidePostgresKycReviewInsideTransaction,
  rejectPostgresHeldTransferInsideTransaction,
  releasePostgresHeldTransferInsideTransaction,
  reversePostgresTransferInsideTransaction,
  setPostgresAccountStatusInsideTransaction,
} from "./postgresAdminOperations.js";

class MockAdminDb {
  public readonly queries: Array<{ sql: string; values?: readonly unknown[] }> = [];

  constructor(private readonly options: { transferStatus?: string } = {}) {}

  async query(sql: string, values?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }> {
    this.queries.push({ sql, values });

    if (sql.includes("FROM admin_users")) {
      return {
        rows: [
          {
            id: values?.[0],
            name: "Operations Manager",
            email: "ops@zebepay.example",
            role: "super_admin",
            password_hash: "hash",
            active: true,
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      };
    }

    if (sql.startsWith("UPDATE accounts SET status")) {
      return { rows: [accountRow({ status: values?.[0] })] };
    }

    if (sql.includes("INSERT INTO account_controls")) {
      return {
        rows: [
          {
            id: values?.[0],
            account_id: values?.[1],
            action: values?.[2],
            reason: values?.[3],
            actor_id: values?.[4],
            created_at: values?.[5],
          },
        ],
      };
    }

    if (sql.startsWith("UPDATE customers")) {
      return {
        rows: [
          {
            id: values?.[3],
            first_name: "Adaeze",
            last_name: "Okafor",
            phone: "+2348012345678",
            email: "adaeze@example.com",
            kyc_tier: values?.[2],
            kyc_status: values?.[0],
            bvn_last4: "4821",
            nin_last4: "1742",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      };
    }

    if (sql.includes("FROM kyc_review_cases")) {
      return { rows: [] };
    }

    if (sql.includes("INSERT INTO kyc_review_cases")) {
      return {
        rows: [
          {
            id: values?.[0],
            customer_id: values?.[1],
            status: values?.[2],
            submitted_tier: values?.[3],
            assigned_to: values?.[4],
            decision: values?.[5],
            decision_reason: values?.[6],
            created_at: values?.[7],
            decided_at: values?.[8],
          },
        ],
      };
    }

    if (sql.includes("FROM transfers WHERE id") && sql.includes("FOR UPDATE")) {
      return { rows: [transferRow({ status: this.options.transferStatus ?? "requires_review" })] };
    }

    if (sql.includes("FROM accounts WHERE id") && sql.includes("FOR UPDATE")) {
      return { rows: [accountRow()] };
    }

    if (sql.startsWith("UPDATE transfers") && sql.includes("status = 'successful'")) {
      return { rows: [transferRow({ status: "successful", completed_at: values?.[0], reviewed_by: values?.[1], reviewed_at: values?.[0] })] };
    }

    if (sql.startsWith("UPDATE transfers") && sql.includes("status = 'failed'")) {
      return { rows: [transferRow({ status: "failed", failure_reason: values?.[0], reviewed_by: values?.[1], reviewed_at: values?.[2] })] };
    }

    if (sql.startsWith("UPDATE transfers") && sql.includes("status = 'reversed'")) {
      return { rows: [transferRow({ status: "reversed", reversed_at: values?.[0], reversal_reason: values?.[1] })] };
    }

    return { rows: [] };
  }
}

function accountRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "acct_pg",
    customer_id: "cus_pg",
    account_number: "1023456789",
    account_name: "Adaeze Okafor",
    currency: "NGN",
    balance_kobo: "245000000",
    available_balance_kobo: "245000000",
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function transferRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "trf_pg",
    customer_id: "cus_pg",
    source_account_id: "acct_pg",
    amount_kobo: "100000",
    beneficiary_name: "Chinedu Okeke",
    beneficiary_account_number: "0123456789",
    beneficiary_bank_code: "000027",
    narration: "Admin operation test",
    channel: "nip_mock",
    idempotency_key: "admin-operation-test",
    customer_device_id: "dev_pg",
    otp_challenge_id: "otp_pg",
    status: "successful",
    reference: "OBNGTEST",
    risk_score: 60,
    risk_level: "high",
    risk_reasons: ["untrusted_device"],
    failure_reason: null,
    created_at: "2026-01-01T00:00:00.000Z",
    completed_at: null,
    reversed_at: null,
    reversal_reason: null,
    reviewed_by: null,
    reviewed_at: null,
    ...overrides,
  };
}

test("freezes account with PostgreSQL account control and audit event", async () => {
  const db = new MockAdminDb();
  const result = await setPostgresAccountStatusInsideTransaction(db, "acct_pg", "freeze", "Suspicious account activity", "adm_001");
  const sql = db.queries.map((entry) => entry.sql);

  assert.equal(result.account.status, "frozen");
  assert.equal(result.control.action, "freeze");
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO account_controls")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO audit_events")));
});

test("records PostgreSQL KYC decision with durable review and audit event", async () => {
  const db = new MockAdminDb();
  const result = await decidePostgresKycReviewInsideTransaction(
    db,
    "cus_pg",
    "approved",
    "tier_2",
    "Documents verified by compliance team",
    "adm_002",
  );
  const sql = db.queries.map((entry) => entry.sql);

  assert.equal(result.customer.kycStatus, "approved");
  assert.equal(result.review.decision, "approved");
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO kyc_review_cases")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO audit_events")));
});

test("audits PostgreSQL KYC needs-more-info decisions without labeling them rejected", async () => {
  const db = new MockAdminDb();
  const result = await decidePostgresKycReviewInsideTransaction(
    db,
    "cus_pg",
    "needs_more_info",
    "tier_2",
    "Utility bill requires clearer image",
    "adm_002",
  );
  const auditInsert = db.queries.find((entry) => entry.sql.includes("INSERT INTO audit_events"));
  const reviewLookup = db.queries.find((entry) => entry.sql.includes("FROM kyc_review_cases"));

  assert.equal(result.customer.kycStatus, "pending_review");
  assert.equal(result.review.decision, "needs_more_info");
  assert.equal(auditInsert?.values?.[3], "kyc.needs_more_info");
  assert.ok(reviewLookup?.sql.includes("ORDER BY created_at DESC"));
});

test("releases PostgreSQL held transfer with debit, ledger, audit, and notification", async () => {
  const db = new MockAdminDb();
  const result = await releasePostgresHeldTransferInsideTransaction(db, "trf_pg", "adm_001");
  const sql = db.queries.map((entry) => entry.sql);

  assert.equal(result.status, "successful");
  assert.ok(sql.some((entry) => entry.includes("UPDATE accounts SET balance_kobo")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO ledger_entries")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO audit_events")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO notifications")));
});

test("rejects PostgreSQL held transfer without account debit", async () => {
  const db = new MockAdminDb();
  const result = await rejectPostgresHeldTransferInsideTransaction(db, "trf_pg", "Rejected after review", "adm_001");
  const sql = db.queries.map((entry) => entry.sql);

  assert.equal(result.status, "failed");
  assert.equal(sql.some((entry) => entry.includes("UPDATE accounts SET balance_kobo")), false);
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO audit_events")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO notifications")));
});

test("reverses PostgreSQL transfer with credit ledger and audit event", async () => {
  const db = new MockAdminDb({ transferStatus: "successful" });
  const result = await reversePostgresTransferInsideTransaction(db, "trf_pg", "Customer reversal request", "adm_001");
  const sql = db.queries.map((entry) => entry.sql);

  assert.equal(result.status, "reversed");
  assert.ok(sql.some((entry) => entry.includes("UPDATE accounts SET balance_kobo")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO ledger_entries")));
  assert.ok(sql.some((entry) => entry.includes("INSERT INTO audit_events")));
});
