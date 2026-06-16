import type {
  PersistenceState,
  ProductionReadinessCheck,
  ProductionReadinessReport,
  StorageMode,
  StorageRecordGroup,
  StorageStatus,
} from "@zebepay/shared";
import { store } from "../data/store.js";

type EnvMap = Record<string, string | undefined>;

const criticalGroupCounts: Array<{ name: string; count: () => number }> = [
  { name: "customers", count: () => store.customers.length },
  { name: "accounts", count: () => store.accounts.length },
  { name: "ledger_entries", count: () => store.ledgerEntries.length },
  { name: "transfers", count: () => store.transfers.length },
  { name: "beneficiaries", count: () => store.beneficiaries.length },
  { name: "admin_users", count: () => store.adminUsers.length },
  { name: "audit_events", count: () => store.auditEvents.length },
  { name: "kyc_review_cases", count: () => store.kycReviewCases.length },
  { name: "account_controls", count: () => store.accountControls.length },
  { name: "customer_devices", count: () => store.customerDevices.length },
  { name: "otp_challenges", count: () => store.otpChallenges.length },
  { name: "notifications", count: () => store.notifications.length },
  { name: "idempotency_keys", count: () => store.idempotencyKeys.size },
  { name: "funding_intents", count: () => store.fundingIntents.length },
  { name: "payout_dispatches", count: () => store.payoutDispatches.length },
  { name: "provider_webhook_deliveries", count: () => 0 },
  { name: "reconciliation_exceptions", count: () => 0 },
  { name: "incident_records", count: () => 0 },
];

export function getStorageMode(env: EnvMap = process.env): StorageMode {
  return env.ZEBEPAY_STORAGE_MODE === "postgres" ? "postgres" : "memory";
}

function getPersistenceState(mode: StorageMode, databaseUrlConfigured: boolean): PersistenceState {
  if (mode === "memory") {
    return "memory_only";
  }

  return databaseUrlConfigured ? "durable" : "not_configured";
}

export function buildStorageStatus(env: EnvMap = process.env): StorageStatus {
  const mode = getStorageMode(env);
  const databaseUrlConfigured = Boolean(env.DATABASE_URL);
  const criticalWritesEnabled = env.ZEBEPAY_PERSISTENCE_CRITICAL_WRITES === "enabled";
  const postgresTransferWritesEnabled = env.ZEBEPAY_POSTGRES_TRANSFER_WRITES === "enabled";
  const postgresAdminWritesEnabled = env.ZEBEPAY_POSTGRES_ADMIN_WRITES === "enabled";
  const postgresAuthSessionEnabled = env.ZEBEPAY_POSTGRES_AUTH_SESSION === "enabled";
  const postgresAuditWritesEnabled = env.ZEBEPAY_POSTGRES_AUDIT_WRITES === "enabled";
  const migrationConfirmation = env.ZEBEPAY_MIGRATIONS_CONFIRMED === "true";
  const persistence = getPersistenceState(mode, databaseUrlConfigured);
  const groups: StorageRecordGroup[] = criticalGroupCounts.map((group) => ({
    name: group.name,
    persistence,
    requiredForProduction: true,
    recordCount: mode === "memory" ? group.count() : undefined,
  }));

  return {
    mode,
    nodeEnv: env.NODE_ENV ?? "development",
    databaseUrlConfigured,
    criticalWritesEnabled,
    postgresTransferWritesEnabled,
    postgresAdminWritesEnabled,
    postgresAuthSessionEnabled,
    postgresAuditWritesEnabled,
    migrationConfirmation,
    generatedAt: new Date().toISOString(),
    groups,
  };
}

export function buildProductionReadinessReport(env: EnvMap = process.env): ProductionReadinessReport {
  const storage = buildStorageStatus(env);
  const checks: ProductionReadinessCheck[] = [
    {
      key: "storage_mode",
      status: storage.mode === "postgres" ? "pass" : "blocker",
      message:
        storage.mode === "postgres"
          ? "PostgreSQL storage mode is selected."
          : "Production cannot run with memory-only operational records.",
    },
    {
      key: "database_url",
      status: storage.databaseUrlConfigured ? "pass" : "blocker",
      message: storage.databaseUrlConfigured ? "DATABASE_URL is configured." : "DATABASE_URL is required for durable storage.",
    },
    {
      key: "critical_write_wiring",
      status: storage.criticalWritesEnabled ? "pass" : "blocker",
      message: storage.criticalWritesEnabled
        ? "Critical write repositories are marked as durable."
        : "Set ZEBEPAY_PERSISTENCE_CRITICAL_WRITES=enabled only after critical repositories write to PostgreSQL.",
    },
    {
      key: "postgres_transfer_writes",
      status: storage.postgresTransferWritesEnabled ? "pass" : "blocker",
      message: storage.postgresTransferWritesEnabled
        ? "PostgreSQL transfer writes are enabled."
        : "Set ZEBEPAY_POSTGRES_TRANSFER_WRITES=enabled only after validating the SQL transfer transaction.",
    },
    {
      key: "postgres_admin_writes",
      status: storage.postgresAdminWritesEnabled ? "pass" : "blocker",
      message: storage.postgresAdminWritesEnabled
        ? "PostgreSQL admin write transactions are enabled."
        : "Set ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled only after validating account controls, KYC decisions, transfer review, and reversal transactions.",
    },
    {
      key: "postgres_auth_session",
      status: storage.postgresAuthSessionEnabled ? "pass" : "blocker",
      message: storage.postgresAuthSessionEnabled
        ? "PostgreSQL auth and session validation are confirmed."
        : "Set ZEBEPAY_POSTGRES_AUTH_SESSION=enabled only after customer login, admin login, and signed session validation read PostgreSQL-backed principals.",
    },
    {
      key: "postgres_audit_writes",
      status: storage.postgresAuditWritesEnabled ? "pass" : "blocker",
      message: storage.postgresAuditWritesEnabled
        ? "PostgreSQL audit-event persistence is confirmed."
        : "Set ZEBEPAY_POSTGRES_AUDIT_WRITES=enabled only after login, transfer, admin, and security audit events write to PostgreSQL.",
    },
    {
      key: "migrations",
      status: storage.migrationConfirmation ? "pass" : "blocker",
      message: storage.migrationConfirmation
        ? "Database migrations have been confirmed by the operator."
        : "Set ZEBEPAY_MIGRATIONS_CONFIRMED=true only after applying the bundled migrations.",
    },
  ];
  const blockers = checks.filter((check) => check.status === "blocker").map((check) => check.message);

  return {
    ready: blockers.length === 0,
    generatedAt: new Date().toISOString(),
    storage,
    checks,
    blockers,
  };
}

export function assertProductionPersistenceReady(env: EnvMap = process.env): void {
  if (env.NODE_ENV !== "production") {
    return;
  }

  const report = buildProductionReadinessReport(env);

  if (!report.ready) {
    throw new Error(`Zebepay production persistence gate blocked startup: ${report.blockers.join(" ")}`);
  }
}
