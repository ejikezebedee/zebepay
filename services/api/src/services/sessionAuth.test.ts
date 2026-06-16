import assert from "node:assert/strict";
import test from "node:test";
import { createSessionToken, requireAdminPermission, requireCustomerSession, shouldBlockDefaultSandboxSigningSecret } from "./sessionAuth.js";

test("blocks default sandbox session secret in production mode", () => {
  assert.equal(shouldBlockDefaultSandboxSigningSecret("production", "replace-this-sandbox-session-secret"), true);
  assert.equal(shouldBlockDefaultSandboxSigningSecret("production", "buyer-supplied-session-secret"), false);
  assert.equal(shouldBlockDefaultSandboxSigningSecret("test", "replace-this-sandbox-session-secret"), false);
});

test("does not require memory-backed principals when PostgreSQL storage mode is selected", () => {
  const previousMode = process.env.ZEBEPAY_STORAGE_MODE;
  process.env.ZEBEPAY_STORAGE_MODE = "postgres";

  try {
    const token = createSessionToken({ kind: "customer", customerId: "cus_pg_only", userId: "usr_pg_only" });
    const session = requireCustomerSession(`Bearer ${token}`);

    assert.equal(session.customerId, "cus_pg_only");
    assert.equal(session.userId, "usr_pg_only");
  } finally {
    if (previousMode === undefined) {
      delete process.env.ZEBEPAY_STORAGE_MODE;
    } else {
      process.env.ZEBEPAY_STORAGE_MODE = previousMode;
    }
  }
});

test("authorizes admin routes from signed role claims in PostgreSQL storage mode", () => {
  const previousMode = process.env.ZEBEPAY_STORAGE_MODE;
  process.env.ZEBEPAY_STORAGE_MODE = "postgres";

  try {
    const auditorToken = createSessionToken({ kind: "admin", adminId: "adm_pg_only", role: "auditor" });
    const auditor = requireAdminPermission(`Bearer ${auditorToken}`, "audit:read");

    assert.equal(auditor.adminId, "adm_pg_only");
    assert.throws(() => requireAdminPermission(`Bearer ${auditorToken}`, "kyc:write"), /cannot perform kyc:write/);
  } finally {
    if (previousMode === undefined) {
      delete process.env.ZEBEPAY_STORAGE_MODE;
    } else {
      process.env.ZEBEPAY_STORAGE_MODE = previousMode;
    }
  }
});
