import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { store } from "../data/store.js";
import { registerAdminRoutes } from "./admin.js";
import { registerAuthRoutes } from "./auth.js";
import { registerBeneficiaryRoutes } from "./beneficiaries.js";
import { registerCustomerRoutes } from "./customers.js";
import { registerNotificationRoutes } from "./notifications.js";
import { registerSecurityRoutes } from "./security.js";
import { registerStatementRoutes } from "./statements.js";
import { registerTransferRoutes } from "./transfers.js";
import { createSessionToken } from "../services/sessionAuth.js";
import "../types.js";

async function buildTestApp() {
  const app = Fastify();
  app.decorate("zebepayStore", store);
  await app.register(registerAuthRoutes);
  await app.register(registerAdminRoutes);
  await app.register(registerCustomerRoutes);
  await app.register(registerBeneficiaryRoutes);
  await app.register(registerStatementRoutes);
  await app.register(registerNotificationRoutes);
  await app.register(registerTransferRoutes);
  await app.register(registerSecurityRoutes);
  return app;
}

test("rejects invalid passwords and protects admin read routes", async () => {
  const app = await buildTestApp();

  const rejectedLogin = await app.inject({
    method: "POST",
    url: "/v1/auth/customer/login",
    payload: { email: "adaeze@example.com", password: "WrongPassword!2026" },
  });

  assert.equal(rejectedLogin.statusCode, 401);

  const unauthenticatedAdminRead = await app.inject({
    method: "GET",
    url: "/v1/admin/audit-events",
  });

  assert.equal(unauthenticatedAdminRead.statusCode, 403);

  const login = await app.inject({
    method: "POST",
    url: "/v1/auth/admin/login",
    payload: { email: "ops@zebepay.example", password: "ZebepayAdmin!2026" },
  });
  const body = login.json<{ data: { session: { accessToken: string } } }>();
  const adminLoginBody = login.json<{ data: { admin: { passwordHash?: string }; session: { accessToken: string } } }>();

  assert.equal(login.statusCode, 200);
  assert.equal(adminLoginBody.data.admin.passwordHash, undefined);
  assert.match(body.data.session.accessToken, /^sandbox\./);

  const authenticatedAdminRead = await app.inject({
    method: "GET",
    url: "/v1/admin/audit-events",
    headers: { authorization: `Bearer ${body.data.session.accessToken}` },
  });

  assert.equal(authenticatedAdminRead.statusCode, 200);

  const adminUsers = await app.inject({
    method: "GET",
    url: "/v1/admin/users",
    headers: { authorization: `Bearer ${body.data.session.accessToken}` },
  });
  const adminUsersBody = adminUsers.json<{ data: Array<{ passwordHash?: string }> }>();

  assert.equal(adminUsers.statusCode, 200);
  assert.equal(adminUsersBody.data.some((admin) => admin.passwordHash), false);
  await app.close();
});

test("protects customer and transfer read routes with bearer sessions", async () => {
  const app = await buildTestApp();

  const unauthenticatedCustomerList = await app.inject({ method: "GET", url: "/v1/customers" });
  const unauthenticatedSummary = await app.inject({ method: "GET", url: "/v1/customers/cus_001/summary" });
  const unauthenticatedTransfers = await app.inject({ method: "GET", url: "/v1/transfers" });
  const unauthenticatedBeneficiaries = await app.inject({ method: "GET", url: "/v1/customers/cus_001/beneficiaries" });
  const unauthenticatedStatement = await app.inject({ method: "GET", url: "/v1/accounts/acct_001/statement" });
  const unauthenticatedNotifications = await app.inject({ method: "GET", url: "/v1/notifications?customerId=cus_001" });

  assert.equal(unauthenticatedCustomerList.statusCode, 403);
  assert.equal(unauthenticatedSummary.statusCode, 401);
  assert.equal(unauthenticatedTransfers.statusCode, 401);
  assert.equal(unauthenticatedBeneficiaries.statusCode, 401);
  assert.equal(unauthenticatedStatement.statusCode, 401);
  assert.equal(unauthenticatedNotifications.statusCode, 401);

  const customerLogin = await app.inject({
    method: "POST",
    url: "/v1/auth/customer/login",
    payload: { email: "adaeze@example.com", password: "ZebepayDemo!2026" },
  });
  const customerBody = customerLogin.json<{ data: { session: { accessToken: string } } }>();

  const authenticatedSummary = await app.inject({
    method: "GET",
    url: "/v1/customers/cus_001/summary",
    headers: { authorization: `Bearer ${customerBody.data.session.accessToken}` },
  });
  const authenticatedTransfers = await app.inject({
    method: "GET",
    url: "/v1/transfers",
    headers: { authorization: `Bearer ${customerBody.data.session.accessToken}` },
  });
  const authenticatedBeneficiaries = await app.inject({
    method: "GET",
    url: "/v1/customers/cus_001/beneficiaries",
    headers: { authorization: `Bearer ${customerBody.data.session.accessToken}` },
  });
  const authenticatedStatement = await app.inject({
    method: "GET",
    url: "/v1/accounts/acct_001/statement",
    headers: { authorization: `Bearer ${customerBody.data.session.accessToken}` },
  });
  const authenticatedNotifications = await app.inject({
    method: "GET",
    url: "/v1/notifications?customerId=cus_001",
    headers: { authorization: `Bearer ${customerBody.data.session.accessToken}` },
  });

  assert.equal(authenticatedSummary.statusCode, 200);
  assert.equal(authenticatedTransfers.statusCode, 200);
  assert.equal(authenticatedBeneficiaries.statusCode, 200);
  assert.equal(authenticatedStatement.statusCode, 200);
  assert.equal(authenticatedNotifications.statusCode, 200);
  await app.close();
});

test("redacts OTP internals and requires the owning customer session to verify", async () => {
  const app = await buildTestApp();

  const customerLogin = await app.inject({
    method: "POST",
    url: "/v1/auth/customer/login",
    payload: { email: "adaeze@example.com", password: "ZebepayDemo!2026" },
  });
  const customerBody = customerLogin.json<{ data: { session: { accessToken: string } } }>();
  const authorization = `Bearer ${customerBody.data.session.accessToken}`;

  const challengeResponse = await app.inject({
    method: "POST",
    url: "/v1/security/otp-challenges",
    headers: { authorization },
    payload: { purpose: "transfer", targetId: "acct_001" },
  });
  const challengeBody = challengeResponse.json<{ data: { id: string; code?: string; consumedAt?: string } }>();
  const storedChallenge = store.otpChallenges.find((challenge) => challenge.id === challengeBody.data.id);

  assert.equal(challengeResponse.statusCode, 201);
  assert.equal(challengeBody.data.code, undefined);
  assert.equal(challengeBody.data.consumedAt, undefined);
  assert.match(storedChallenge?.code ?? "", /^\d{6}$/);

  const rejectedVerification = await app.inject({
    method: "POST",
    url: `/v1/security/otp-challenges/${challengeBody.data.id}/verify`,
    headers: { authorization },
    payload: { code: "000000" },
  });

  assert.equal(rejectedVerification.statusCode, 401);

  const verifiedResponse = await app.inject({
    method: "POST",
    url: `/v1/security/otp-challenges/${challengeBody.data.id}/verify`,
    headers: { authorization },
    payload: { code: storedChallenge?.code },
  });
  const verifiedBody = verifiedResponse.json<{ data: { id: string; verified: boolean; code?: string; consumedAt?: string } }>();

  assert.equal(verifiedResponse.statusCode, 200);
  assert.equal(verifiedBody.data.verified, true);
  assert.equal(verifiedBody.data.code, undefined);
  assert.equal(verifiedBody.data.consumedAt, undefined);
  await app.close();
});

test("prevents a verified OTP from approving more than one transfer", async () => {
  const app = await buildTestApp();

  const customerLogin = await app.inject({
    method: "POST",
    url: "/v1/auth/customer/login",
    payload: { email: "adaeze@example.com", password: "ZebepayDemo!2026" },
  });
  const customerBody = customerLogin.json<{ data: { session: { accessToken: string } } }>();
  const customerAuth = `Bearer ${customerBody.data.session.accessToken}`;

  const challengeResponse = await app.inject({
    method: "POST",
    url: "/v1/security/otp-challenges",
    headers: { authorization: customerAuth },
    payload: { purpose: "transfer", targetId: "acct_001" },
  });
  const challengeBody = challengeResponse.json<{ data: { id: string } }>();
  const storedChallenge = store.otpChallenges.find((entry) => entry.id === challengeBody.data.id);

  const verifiedResponse = await app.inject({
    method: "POST",
    url: `/v1/security/otp-challenges/${challengeBody.data.id}/verify`,
    headers: { authorization: customerAuth },
    payload: { code: storedChallenge?.code },
  });

  assert.equal(verifiedResponse.statusCode, 200);

  const firstTransfer = await app.inject({
    method: "POST",
    url: "/v1/transfers",
    headers: { authorization: customerAuth },
    payload: {
      sourceAccountId: "acct_001",
      amountKobo: 16_500,
      beneficiaryName: "OTP Reuse Guard One",
      beneficiaryAccountNumber: "0123456789",
      beneficiaryBankCode: "000027",
      narration: "OTP reuse guard one",
      channel: "nip_mock",
      idempotencyKey: `route-otp-once-${Date.now()}`,
      customerDeviceId: "dev_001",
      otpChallengeId: challengeBody.data.id,
    },
  });

  assert.equal(firstTransfer.statusCode, 201);
  assert.ok(store.otpChallenges.find((entry) => entry.id === challengeBody.data.id)?.consumedAt);

  const secondTransfer = await app.inject({
    method: "POST",
    url: "/v1/transfers",
    headers: { authorization: customerAuth },
    payload: {
      sourceAccountId: "acct_001",
      amountKobo: 17_500,
      beneficiaryName: "OTP Reuse Guard Two",
      beneficiaryAccountNumber: "0123456789",
      beneficiaryBankCode: "000027",
      narration: "OTP reuse guard two",
      channel: "nip_mock",
      idempotencyKey: `route-otp-reuse-${Date.now()}`,
      customerDeviceId: "dev_001",
      otpChallengeId: challengeBody.data.id,
    },
  });
  const secondTransferBody = secondTransfer.json<{
    data: { status: string; failureReason?: string; riskReasons: string[] };
  }>();

  assert.equal(secondTransfer.statusCode, 201);
  assert.equal(secondTransferBody.data.status, "requires_review");
  assert.equal(secondTransferBody.data.failureReason, "Transfer requires a verified, unconsumed OTP challenge.");
  assert.ok(secondTransferBody.data.riskReasons.includes("otp_not_verified"));
  await app.close();
});

test("smokes transfer review queue release and rejection through admin bearer auth", async () => {
  const app = await buildTestApp();

  const customerLogin = await app.inject({
    method: "POST",
    url: "/v1/auth/customer/login",
    payload: { email: "adaeze@example.com", password: "ZebepayDemo!2026" },
  });
  const customerBody = customerLogin.json<{ data: { session: { accessToken: string } } }>();
  const customerAuth = `Bearer ${customerBody.data.session.accessToken}`;

  const firstHeldTransfer = await app.inject({
    method: "POST",
    url: "/v1/transfers",
    headers: { authorization: customerAuth },
    payload: {
      sourceAccountId: "acct_001",
      amountKobo: 12_500,
      beneficiaryName: "Route Smoke Release",
      beneficiaryAccountNumber: "0123456789",
      beneficiaryBankCode: "000027",
      narration: "Route smoke release",
      channel: "nip_mock",
      idempotencyKey: `route-release-${Date.now()}`,
    },
  });
  const firstHeldBody = firstHeldTransfer.json<{ data: { id: string; status: string } }>();

  assert.equal(firstHeldTransfer.statusCode, 201);
  assert.equal(firstHeldBody.data.status, "requires_review");

  const spoofedRelease = await app.inject({
    method: "POST",
    url: `/v1/admin/transfers/${firstHeldBody.data.id}/release`,
    headers: { "x-admin-id": "adm_001" },
  });

  assert.equal(spoofedRelease.statusCode, 403);

  const adminLogin = await app.inject({
    method: "POST",
    url: "/v1/auth/admin/login",
    payload: { email: "ops@zebepay.example", password: "ZebepayAdmin!2026" },
  });
  const adminBody = adminLogin.json<{ data: { session: { accessToken: string } } }>();
  const adminAuth = `Bearer ${adminBody.data.session.accessToken}`;

  const reviewQueue = await app.inject({
    method: "GET",
    url: "/v1/admin/transfers/review-queue",
    headers: { authorization: adminAuth },
  });
  const reviewQueueBody = reviewQueue.json<{ data: Array<{ id: string }> }>();

  assert.equal(reviewQueue.statusCode, 200);
  assert.ok(reviewQueueBody.data.some((transfer) => transfer.id === firstHeldBody.data.id));

  const releasedTransfer = await app.inject({
    method: "POST",
    url: `/v1/admin/transfers/${firstHeldBody.data.id}/release`,
    headers: { authorization: adminAuth },
  });
  const releasedBody = releasedTransfer.json<{ data: { status: string; reviewedBy?: string } }>();

  assert.equal(releasedTransfer.statusCode, 200);
  assert.equal(releasedBody.data.status, "successful");
  assert.equal(releasedBody.data.reviewedBy, "adm_001");

  const secondHeldTransfer = await app.inject({
    method: "POST",
    url: "/v1/transfers",
    headers: { authorization: customerAuth },
    payload: {
      sourceAccountId: "acct_001",
      amountKobo: 13_500,
      beneficiaryName: "Route Smoke Reject",
      beneficiaryAccountNumber: "0123456789",
      beneficiaryBankCode: "000027",
      narration: "Route smoke reject",
      channel: "nip_mock",
      idempotencyKey: `route-reject-${Date.now()}`,
    },
  });
  const secondHeldBody = secondHeldTransfer.json<{ data: { id: string; status: string } }>();

  assert.equal(secondHeldTransfer.statusCode, 201);
  assert.equal(secondHeldBody.data.status, "requires_review");

  const rejectedTransfer = await app.inject({
    method: "POST",
    url: `/v1/admin/transfers/${secondHeldBody.data.id}/reject`,
    headers: { authorization: adminAuth },
    payload: { reason: "Route smoke rejection coverage." },
  });
  const rejectedBody = rejectedTransfer.json<{ data: { status: string; failureReason?: string; reviewedBy?: string } }>();

  assert.equal(rejectedTransfer.statusCode, 200);
  assert.equal(rejectedBody.data.status, "failed");
  assert.equal(rejectedBody.data.failureReason, "Route smoke rejection coverage.");
  assert.equal(rejectedBody.data.reviewedBy, "adm_001");
  await app.close();
});

test("returns conflict instead of auth failure for transfer idempotency mismatch", async () => {
  const app = await buildTestApp();

  const customerLogin = await app.inject({
    method: "POST",
    url: "/v1/auth/customer/login",
    payload: { email: "adaeze@example.com", password: "ZebepayDemo!2026" },
  });
  const customerBody = customerLogin.json<{ data: { session: { accessToken: string } } }>();
  const customerAuth = `Bearer ${customerBody.data.session.accessToken}`;

  const createVerifiedOtp = async () => {
    const challenge = await app.inject({
      method: "POST",
      url: "/v1/security/otp-challenges",
      headers: { authorization: customerAuth },
      payload: { purpose: "transfer", targetId: "acct_001" },
    });
    const challengeBody = challenge.json<{ data: { id: string } }>();
    const storedChallenge = store.otpChallenges.find((entry) => entry.id === challengeBody.data.id);
    await app.inject({
      method: "POST",
      url: `/v1/security/otp-challenges/${challengeBody.data.id}/verify`,
      headers: { authorization: customerAuth },
      payload: { code: storedChallenge?.code },
    });
    return challengeBody.data.id;
  };

  const idempotencyKey = `route-idempotency-${Date.now()}`;
  const basePayload = {
    sourceAccountId: "acct_001",
    amountKobo: 14_500,
    beneficiaryName: "Route Idempotency",
    beneficiaryAccountNumber: "0123456789",
    beneficiaryBankCode: "000027",
    narration: "Route idempotency test",
    channel: "nip_mock",
    idempotencyKey,
    customerDeviceId: "dev_001",
    otpChallengeId: await createVerifiedOtp(),
  };

  const firstTransfer = await app.inject({
    method: "POST",
    url: "/v1/transfers",
    headers: { authorization: customerAuth },
    payload: basePayload,
  });

  assert.equal(firstTransfer.statusCode, 201);

  const mismatchedTransfer = await app.inject({
    method: "POST",
    url: "/v1/transfers",
    headers: { authorization: customerAuth },
    payload: { ...basePayload, amountKobo: 15_500, otpChallengeId: await createVerifiedOtp() },
  });
  const mismatchBody = mismatchedTransfer.json<{ error: string; message: string }>();

  assert.equal(mismatchedTransfer.statusCode, 409);
  assert.equal(mismatchBody.error, "TRANSFER_NOT_ACCEPTED");
  assert.match(mismatchBody.message, /Idempotency key has already been used/);
  await app.close();
});

test("blocks transfer creation in PostgreSQL mode until transactional cutover is complete", async () => {
  const previousStorageMode = process.env.ZEBEPAY_STORAGE_MODE;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.ZEBEPAY_STORAGE_MODE = "postgres";
  process.env.DATABASE_URL = "postgresql://zebepay:zebepay@localhost:5432/zebepay";

  const app = await buildTestApp();

  try {
    const customerToken = createSessionToken({ kind: "customer", customerId: "cus_001", userId: "usr_001" });

    const blockedTransfer = await app.inject({
      method: "POST",
      url: "/v1/transfers",
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {
        sourceAccountId: "acct_001",
        amountKobo: 14_500,
        beneficiaryName: "Postgres Cutover Guard",
        beneficiaryAccountNumber: "0123456789",
        beneficiaryBankCode: "000027",
        narration: "Postgres cutover guard",
        channel: "nip_mock",
        idempotencyKey: `route-postgres-cutover-${Date.now()}`,
      },
    });
    const blockedBody = blockedTransfer.json<{ error: string }>();

    assert.equal(blockedTransfer.statusCode, 503);
    assert.equal(blockedBody.error, "TRANSFER_CUTOVER_REQUIRED");
  } finally {
    if (previousStorageMode === undefined) {
      delete process.env.ZEBEPAY_STORAGE_MODE;
    } else {
      process.env.ZEBEPAY_STORAGE_MODE = previousStorageMode;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }

    await app.close();
  }
});
