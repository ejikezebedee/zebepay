import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { store } from "../data/store.js";
import { registerAdminRoutes } from "./admin.js";
import { registerAuthRoutes } from "./auth.js";
import { createSessionToken } from "../services/sessionAuth.js";
import "../types.js";

async function buildTestApp() {
  const app = Fastify();
  app.decorate("zebepayStore", store);
  await app.register(registerAuthRoutes);
  await app.register(registerAdminRoutes);
  return app;
}

test("protects admin storage status and readiness routes", async () => {
  const app = await buildTestApp();

  const blockedStorage = await app.inject({ method: "GET", url: "/v1/admin/storage/status" });
  const blockedReadiness = await app.inject({ method: "GET", url: "/v1/admin/production-readiness" });

  assert.equal(blockedStorage.statusCode, 403);
  assert.equal(blockedReadiness.statusCode, 403);

  const adminLogin = await app.inject({
    method: "POST",
    url: "/v1/auth/admin/login",
    payload: { email: "ops@zebepay.example", password: "ZebepayAdmin!2026" },
  });
  const adminBody = adminLogin.json<{ data: { session: { accessToken: string } } }>();
  const adminAuth = `Bearer ${adminBody.data.session.accessToken}`;

  const storage = await app.inject({
    method: "GET",
    url: "/v1/admin/storage/status",
    headers: { authorization: adminAuth },
  });
  const storageBody = storage.json<{ data: { mode: string; groups: Array<{ name: string; persistence: string }> } }>();

  assert.equal(storage.statusCode, 200);
  assert.equal(storageBody.data.mode, "memory");
  assert.ok(storageBody.data.groups.some((group) => group.name === "transfers" && group.persistence === "memory_only"));

  const readiness = await app.inject({
    method: "GET",
    url: "/v1/admin/production-readiness",
    headers: { authorization: adminAuth },
  });
  const readinessBody = readiness.json<{ data: { ready: boolean; blockers: string[] } }>();

  assert.equal(readiness.statusCode, 200);
  assert.equal(readinessBody.data.ready, false);
  assert.ok(readinessBody.data.blockers.length > 0);
  await app.close();
});

test("blocks admin writes in PostgreSQL mode until admin write cutover is enabled", async () => {
  const previousStorageMode = process.env.ZEBEPAY_STORAGE_MODE;
  const previousAdminWrites = process.env.ZEBEPAY_POSTGRES_ADMIN_WRITES;
  process.env.ZEBEPAY_STORAGE_MODE = "postgres";
  delete process.env.ZEBEPAY_POSTGRES_ADMIN_WRITES;

  const app = await buildTestApp();

  try {
    const adminAuth = `Bearer ${createSessionToken({ kind: "admin", adminId: "adm_002", role: "compliance_officer" })}`;

    const response = await app.inject({
      method: "POST",
      url: "/v1/admin/accounts/acct_001/freeze",
      headers: { authorization: adminAuth },
      payload: { reason: "Compliance review requested" },
    });
    const body = response.json<{ error: string }>();

    assert.equal(response.statusCode, 503);
    assert.equal(body.error, "ADMIN_WRITE_CUTOVER_REQUIRED");
  } finally {
    if (previousStorageMode) {
      process.env.ZEBEPAY_STORAGE_MODE = previousStorageMode;
    } else {
      delete process.env.ZEBEPAY_STORAGE_MODE;
    }

    if (previousAdminWrites) {
      process.env.ZEBEPAY_POSTGRES_ADMIN_WRITES = previousAdminWrites;
    } else {
      delete process.env.ZEBEPAY_POSTGRES_ADMIN_WRITES;
    }

    await app.close();
  }
});
