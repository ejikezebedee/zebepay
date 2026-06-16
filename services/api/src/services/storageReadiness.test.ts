import assert from "node:assert/strict";
import test from "node:test";
import {
  assertProductionPersistenceReady,
  buildProductionReadinessReport,
  buildStorageStatus,
} from "./storageReadiness.js";

test("reports memory storage mode as local-only with critical record counts", () => {
  const status = buildStorageStatus({ NODE_ENV: "development", ZEBEPAY_STORAGE_MODE: "memory" });

  assert.equal(status.mode, "memory");
  assert.equal(status.databaseUrlConfigured, false);
  assert.equal(status.groups.every((group) => group.persistence === "memory_only"), true);
  assert.ok(status.groups.some((group) => group.name === "audit_events" && typeof group.recordCount === "number"));
});

test("blocks production readiness until durable storage wiring is confirmed", () => {
  const report = buildProductionReadinessReport({
    NODE_ENV: "production",
    ZEBEPAY_STORAGE_MODE: "memory",
  });

  assert.equal(report.ready, false);
  assert.ok(report.blockers.some((blocker) => blocker.includes("memory-only")));
});

test("passes production readiness when durable PostgreSQL controls are confirmed", () => {
  const report = buildProductionReadinessReport({
    NODE_ENV: "production",
    ZEBEPAY_STORAGE_MODE: "postgres",
    DATABASE_URL: "postgresql://zebepay:zebepay@localhost:5432/zebepay",
    ZEBEPAY_PERSISTENCE_CRITICAL_WRITES: "enabled",
    ZEBEPAY_POSTGRES_TRANSFER_WRITES: "enabled",
    ZEBEPAY_POSTGRES_ADMIN_WRITES: "enabled",
    ZEBEPAY_POSTGRES_AUTH_SESSION: "enabled",
    ZEBEPAY_POSTGRES_AUDIT_WRITES: "enabled",
    ZEBEPAY_MIGRATIONS_CONFIRMED: "true",
  });

  assert.equal(report.ready, true);
  assert.deepEqual(report.blockers, []);
});

test("blocks production readiness until PostgreSQL auth/session and audit persistence are confirmed", () => {
  const report = buildProductionReadinessReport({
    NODE_ENV: "production",
    ZEBEPAY_STORAGE_MODE: "postgres",
    DATABASE_URL: "postgresql://zebepay:zebepay@localhost:5432/zebepay",
    ZEBEPAY_PERSISTENCE_CRITICAL_WRITES: "enabled",
    ZEBEPAY_POSTGRES_TRANSFER_WRITES: "enabled",
    ZEBEPAY_POSTGRES_ADMIN_WRITES: "enabled",
    ZEBEPAY_MIGRATIONS_CONFIRMED: "true",
  });

  assert.equal(report.ready, false);
  assert.ok(report.checks.some((check) => check.key === "postgres_auth_session" && check.status === "blocker"));
  assert.ok(report.checks.some((check) => check.key === "postgres_audit_writes" && check.status === "blocker"));
});

test("throws during production startup when persistence gate fails", () => {
  assert.throws(
    () => assertProductionPersistenceReady({ NODE_ENV: "production", ZEBEPAY_STORAGE_MODE: "memory" }),
    /production persistence gate blocked startup/,
  );
});
