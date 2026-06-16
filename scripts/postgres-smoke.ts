import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Pool } = pg;

const rootDir = process.cwd();
const apiPort = Number(process.env.ZEBEPAY_SMOKE_PORT ?? 4515);
const baseUrl = process.env.ZEBEPAY_SMOKE_BASE_URL ?? `http://127.0.0.1:${apiPort}`;
const sessionSecret = process.env.ZEBEPAY_SANDBOX_SESSION_SECRET ?? "test-zebepay-sandbox-session-secret";

type JsonObject = Record<string, unknown>;
type SmokeTransfer = { data: { id: string; status: string } };

interface SmokeEvidenceIds {
  otpChallengeId: string;
  successfulTransferId: string;
  releasedTransferId: string;
  rejectedTransferId: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for the PostgreSQL smoke harness.`);
  }
  return value;
}

function uniqueSuffix(): string {
  return `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

function assertSmoke(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function applySqlFile(pool: pg.Pool, relativePath: string): Promise<void> {
  const sql = await readFile(path.join(rootDir, relativePath), "utf8");
  await pool.query(sql);
}

async function waitForReady(): Promise<void> {
  const deadline = Date.now() + 30_000;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = (error as Error).message;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`API did not become healthy at ${baseUrl}: ${lastError}`);
}

async function readOtpDeliveryCode(pool: pg.Pool, challengeId: string): Promise<string> {
  const result = await pool.query(
    `SELECT body FROM notifications
     WHERE related_entity_type = 'otp_challenge' AND related_entity_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [challengeId],
  );
  const body = String(result.rows[0]?.body ?? "");
  const code = body.match(/\b\d{6}\b/)?.[0];

  if (!code) {
    throw new Error(`Could not read sandbox OTP delivery code for ${challengeId}.`);
  }

  return code;
}

async function request<T extends JsonObject>(
  method: string,
  urlPath: string,
  token?: string,
  body?: JsonObject,
  expectedStatus: number[] = [200],
): Promise<T> {
  const response = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as T;

  if (!expectedStatus.includes(response.status)) {
    throw new Error(`${method} ${urlPath} returned ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function loginCustomer(): Promise<string> {
  const response = await request<{ data: { session: { accessToken: string } } }>("POST", "/v1/auth/customer/login", undefined, {
    email: "adaeze@example.com",
    password: "ZebepayDemo!2026",
  });
  return response.data.session.accessToken;
}

async function loginAdmin(): Promise<string> {
  const response = await request<{ data: { session: { accessToken: string } } }>("POST", "/v1/auth/admin/login", undefined, {
    email: "ops@zebepay.example",
    password: "ZebepayAdmin!2026",
  });
  return response.data.session.accessToken;
}

async function verifyDatabaseEvidence(pool: pg.Pool, ids: SmokeEvidenceIds): Promise<JsonObject> {
  const transfers = await pool.query(
    `SELECT id, status
     FROM transfers
     WHERE id = ANY($1::text[])
     ORDER BY id`,
    [[ids.successfulTransferId, ids.releasedTransferId, ids.rejectedTransferId]],
  );
  const transferStatuses = Object.fromEntries(transfers.rows.map((row) => [String(row.id), String(row.status)]));

  assertSmoke(transferStatuses[ids.successfulTransferId] === "reversed", "Successful smoke transfer was not reversed in PostgreSQL.");
  assertSmoke(transferStatuses[ids.releasedTransferId] === "successful", "Held smoke transfer was not released in PostgreSQL.");
  assertSmoke(transferStatuses[ids.rejectedTransferId] === "failed", "Held smoke transfer was not rejected in PostgreSQL.");

  const otp = await pool.query("SELECT consumed_at IS NOT NULL AS consumed FROM otp_challenges WHERE id = $1 LIMIT 1", [ids.otpChallengeId]);
  assertSmoke(otp.rows[0]?.consumed === true, "Verified OTP challenge was not consumed by the successful transfer.");

  const ledger = await pool.query(
    `SELECT transaction_id, entry_type
     FROM ledger_entries
     WHERE transaction_id = ANY($1::text[])
     ORDER BY created_at ASC`,
    [[ids.successfulTransferId, ids.releasedTransferId, `${ids.successfulTransferId}_reversal`]],
  );
  const ledgerKeys = new Set(ledger.rows.map((row) => `${String(row.transaction_id)}:${String(row.entry_type)}`));

  assertSmoke(ledgerKeys.has(`${ids.successfulTransferId}:debit`), "Successful transfer debit ledger entry is missing.");
  assertSmoke(ledgerKeys.has(`${ids.releasedTransferId}:debit`), "Released transfer debit ledger entry is missing.");
  assertSmoke(ledgerKeys.has(`${ids.successfulTransferId}_reversal:credit`), "Reversal credit ledger entry is missing.");

  const audit = await pool.query(
    `SELECT action, entity_id
     FROM audit_events
     WHERE entity_type = 'transfer'
       AND entity_id = ANY($1::text[])`,
    [[ids.successfulTransferId, ids.releasedTransferId, ids.rejectedTransferId]],
  );
  const auditKeys = new Set(audit.rows.map((row) => `${String(row.entity_id)}:${String(row.action)}`));

  assertSmoke(auditKeys.has(`${ids.successfulTransferId}:transfer.create`), "Transfer create audit event is missing.");
  assertSmoke(auditKeys.has(`${ids.successfulTransferId}:transfer.reverse`), "Transfer reversal audit event is missing.");
  assertSmoke(auditKeys.has(`${ids.releasedTransferId}:transfer.release`), "Transfer release audit event is missing.");
  assertSmoke(auditKeys.has(`${ids.rejectedTransferId}:transfer.reject`), "Transfer reject audit event is missing.");

  const notifications = await pool.query(
    `SELECT related_entity_id, subject
     FROM notifications
     WHERE related_entity_type = 'transfer'
       AND related_entity_id = ANY($1::text[])`,
    [[ids.successfulTransferId, ids.releasedTransferId, ids.rejectedTransferId]],
  );
  assertSmoke(notifications.rows.length >= 3, "Transfer notification evidence is incomplete.");

  return {
    transfers: transferStatuses,
    otpConsumed: true,
    ledgerEntries: ledger.rows.length,
    auditEvents: audit.rows.length,
    transferNotifications: notifications.rows.length,
  };
}

function startApi(): ChildProcessWithoutNullStreams | undefined {
  if (process.env.ZEBEPAY_SMOKE_BASE_URL) {
    return undefined;
  }

  return spawn("npm", ["run", "dev", "-w", "@zebepay/api"], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(apiPort),
      HOST: "127.0.0.1",
      NODE_ENV: "development",
      ZEBEPAY_STORAGE_MODE: "postgres",
      ZEBEPAY_POSTGRES_TRANSFER_WRITES: "enabled",
      ZEBEPAY_POSTGRES_ADMIN_WRITES: "enabled",
      ZEBEPAY_POSTGRES_AUTH_SESSION: "enabled",
      ZEBEPAY_POSTGRES_AUDIT_WRITES: "enabled",
      ZEBEPAY_PERSISTENCE_CRITICAL_WRITES: "enabled",
      ZEBEPAY_MIGRATIONS_CONFIRMED: "true",
      ZEBEPAY_SANDBOX_SESSION_SECRET: sessionSecret,
    },
    stdio: "pipe",
  });
}

async function main(): Promise<void> {
  const databaseUrl = requireEnv("DATABASE_URL");
  const applySeed = process.argv.includes("--seed");
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    if (applySeed) {
      await applySqlFile(pool, "db/migrations/001_core_banking_schema.sql");
      await applySqlFile(pool, "db/seeds/phase15_postgres_validation_seed.sql");
    }

    const seedCheck = await pool.query("SELECT id FROM accounts WHERE id = 'acct_001' LIMIT 1");
    if (!seedCheck.rows[0]) {
      throw new Error("Validation seed is missing. Re-run with --seed against a disposable PostgreSQL database.");
    }

    const server = startApi();
    const serverErrors: string[] = [];
    server?.stderr.on("data", (chunk) => serverErrors.push(String(chunk)));

    try {
      await waitForReady();

      const customerToken = await loginCustomer();
      const adminToken = await loginAdmin();
      await request("GET", "/v1/customers/cus_001/summary", customerToken);

      const beneficiaryNumber = String(Math.floor(1000000000 + Math.random() * 8999999999));
      const beneficiary = await request<{ data: { id: string } }>(
        "POST",
        "/v1/beneficiaries",
        customerToken,
        {
          customerId: "cus_001",
          name: "Phase 19 Smoke Beneficiary",
          accountNumber: beneficiaryNumber,
          bankCode: "000027",
        },
        [201],
      );
      await request("DELETE", `/v1/customers/cus_001/beneficiaries/${beneficiary.data.id}`, customerToken);

      const apiOtp = await request<{ data: { id: string; code?: string } }>(
        "POST",
        "/v1/security/otp-challenges",
        customerToken,
        { purpose: "transfer", targetId: "acct_001" },
        [201],
      );
      if (apiOtp.data.code) {
        throw new Error("OTP challenge response exposed a code. Expected provider-style delivery through notifications.");
      }
      const apiOtpCode = await readOtpDeliveryCode(pool, apiOtp.data.id);
      await request("POST", `/v1/security/otp-challenges/${apiOtp.data.id}/verify`, customerToken, { code: apiOtpCode });

      const successfulTransfer = await request<SmokeTransfer>(
        "POST",
        "/v1/transfers",
        customerToken,
        {
          sourceAccountId: "acct_001",
          amountKobo: 125000,
          beneficiaryName: "Phase 19 Transfer Success",
          beneficiaryAccountNumber: "2222222222",
          beneficiaryBankCode: "000027",
          narration: "Phase 19 successful PostgreSQL smoke transfer",
          channel: "nip_mock",
          idempotencyKey: `phase19-success-${uniqueSuffix()}`,
          customerDeviceId: "dev_001",
          otpChallengeId: apiOtp.data.id,
        },
        [201],
      );
      if (successfulTransfer.data.status !== "successful") {
        throw new Error(`Expected successful transfer, got ${successfulTransfer.data.status}`);
      }

      const heldForRelease = await request<SmokeTransfer>(
        "POST",
        "/v1/transfers",
        customerToken,
        {
          sourceAccountId: "acct_001",
          amountKobo: 225000,
          beneficiaryName: "Phase 19 Held Release",
          beneficiaryAccountNumber: "3333333333",
          beneficiaryBankCode: "000027",
          narration: "Phase 19 held transfer release smoke",
          channel: "nip_mock",
          idempotencyKey: `phase19-release-${uniqueSuffix()}`,
          customerDeviceId: "dev_001",
        },
        [201],
      );
      if (heldForRelease.data.status !== "requires_review") {
        throw new Error(`Expected release candidate to require review, got ${heldForRelease.data.status}`);
      }
      await request("GET", "/v1/admin/transfers/review-queue", adminToken);
      const releasedTransfer = await request<SmokeTransfer>("POST", `/v1/admin/transfers/${heldForRelease.data.id}/release`, adminToken);
      assertSmoke(releasedTransfer.data.status === "successful", `Expected released transfer to be successful, got ${releasedTransfer.data.status}`);

      const heldForReject = await request<SmokeTransfer>(
        "POST",
        "/v1/transfers",
        customerToken,
        {
          sourceAccountId: "acct_001",
          amountKobo: 325000,
          beneficiaryName: "Phase 19 Held Reject",
          beneficiaryAccountNumber: "4444444444",
          beneficiaryBankCode: "000027",
          narration: "Phase 19 held transfer reject smoke",
          channel: "nip_mock",
          idempotencyKey: `phase19-reject-${uniqueSuffix()}`,
          customerDeviceId: "dev_001",
        },
        [201],
      );
      const rejectedTransfer = await request<SmokeTransfer>("POST", `/v1/admin/transfers/${heldForReject.data.id}/reject`, adminToken, {
        reason: "Phase 19 smoke rejection validation.",
      });
      assertSmoke(rejectedTransfer.data.status === "failed", `Expected rejected transfer to be failed, got ${rejectedTransfer.data.status}`);

      const reversedTransfer = await request<SmokeTransfer>("POST", `/v1/admin/transfers/${successfulTransfer.data.id}/reverse`, adminToken, {
        reason: "Phase 19 smoke reversal validation.",
      });
      assertSmoke(reversedTransfer.data.status === "reversed", `Expected reversed transfer to be reversed, got ${reversedTransfer.data.status}`);

      const readiness = await request<{ productionReady?: boolean; blockers?: unknown[] }>("GET", "/ready");
      assertSmoke(readiness.productionReady === true, `Production readiness still has blockers: ${JSON.stringify(readiness.blockers ?? [])}`);
      const databaseEvidence = await verifyDatabaseEvidence(pool, {
        otpChallengeId: apiOtp.data.id,
        successfulTransferId: successfulTransfer.data.id,
        releasedTransferId: heldForRelease.data.id,
        rejectedTransferId: heldForReject.data.id,
      });

      console.log(
        JSON.stringify(
          {
            status: "passed",
            phase: "19",
            storageMode: "postgres",
            productionReady: true,
            checks: {
              customerLogin: "passed",
              adminLogin: "passed",
              customerSummary: "passed",
              beneficiaryCreateDisable: "passed",
              otpCreateVerifyConsume: "passed",
              transferCreateReleaseRejectReverse: "passed",
              databaseEvidence,
            },
          },
          null,
          2,
        ),
      );
    } catch (error) {
      if (serverErrors.length > 0) {
        console.error(serverErrors.slice(-6).join(""));
      }
      throw error;
    } finally {
      server?.kill("SIGTERM");
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
