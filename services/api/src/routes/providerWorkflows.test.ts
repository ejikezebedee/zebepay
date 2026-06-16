import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { store } from "../data/store.js";
import { registerAuthRoutes } from "./auth.js";
import { registerProviderWorkflowRoutes } from "./providerWorkflows.js";
import "../types.js";

async function buildTestApp() {
  const app = Fastify();
  app.decorate("zebepayStore", store);
  await app.register(registerAuthRoutes);
  await app.register(registerProviderWorkflowRoutes);
  return app;
}

test("creates protected funding and payout provider workflow records", async () => {
  const app = await buildTestApp();

  const customerLogin = await app.inject({
    method: "POST",
    url: "/v1/auth/customer/login",
    payload: { email: "adaeze@example.com", password: "ZebepayDemo!2026" },
  });
  const customerBody = customerLogin.json<{ data: { session: { accessToken: string } } }>();
  const customerAuth = `Bearer ${customerBody.data.session.accessToken}`;

  const funding = await app.inject({
    method: "POST",
    url: "/v1/funding/intents",
    headers: { authorization: customerAuth },
    payload: { amountKobo: 25_000_00, provider: "sandbox_bank_transfer" },
  });
  const fundingBody = funding.json<{ data: { status: string; virtualAccountNumber: string } }>();

  assert.equal(funding.statusCode, 201);
  assert.equal(fundingBody.data.status, "pending_provider_confirmation");
  assert.match(fundingBody.data.virtualAccountNumber, /^\d{10}$/);

  const payout = await app.inject({
    method: "POST",
    url: "/v1/payouts/dispatches",
    headers: { authorization: customerAuth },
    payload: {
      sourceAccountId: "acct_001",
      amountKobo: 10_000_00,
      beneficiaryAccountNumber: "0123456789",
      beneficiaryBankCode: "000027",
      provider: "sandbox_nip",
    },
  });
  const payoutBody = payout.json<{ data: { status: string; reference: string } }>();

  assert.equal(payout.statusCode, 201);
  assert.equal(payoutBody.data.status, "pending_provider_dispatch");
  assert.match(payoutBody.data.reference, /^OBNGPAY/);
  await app.close();
});

test("protects reconciliation summary with admin bearer auth", async () => {
  const app = await buildTestApp();

  const blocked = await app.inject({ method: "GET", url: "/v1/admin/reconciliation/summary" });

  assert.equal(blocked.statusCode, 403);

  const adminLogin = await app.inject({
    method: "POST",
    url: "/v1/auth/admin/login",
    payload: { email: "ops@zebepay.example", password: "ZebepayAdmin!2026" },
  });
  const adminBody = adminLogin.json<{ data: { session: { accessToken: string } } }>();
  const allowed = await app.inject({
    method: "GET",
    url: "/v1/admin/reconciliation/summary",
    headers: { authorization: `Bearer ${adminBody.data.session.accessToken}` },
  });
  const allowedBody = allowed.json<{ data: { providerSettlementStatus: string; ledgerCreditKobo: number } }>();

  assert.equal(allowed.statusCode, 200);
  assert.equal(allowedBody.data.providerSettlementStatus, "sandbox_reconciliation_ready");
  assert.ok(allowedBody.data.ledgerCreditKobo > 0);
  await app.close();
});
