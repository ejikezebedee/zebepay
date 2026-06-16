import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { store } from "../data/store.js";
import { appendAuditEvent } from "../services/audit.js";
import { queueNotification } from "../services/notifications.js";
import { requireAdminPermission, requireCustomerSession } from "../services/sessionAuth.js";
import { buildReconciliationSummary, createFundingIntent, createPayoutDispatch } from "../services/providerAdapters.js";

const providerSchema = z.enum(["sandbox_bank_transfer", "sandbox_nip"]).default("sandbox_bank_transfer");

const fundingSchema = z.object({
  amountKobo: z.number().int().positive(),
  provider: providerSchema,
});

const payoutSchema = z.object({
  sourceAccountId: z.string().min(1),
  amountKobo: z.number().int().positive(),
  beneficiaryAccountNumber: z.string().regex(/^\d{10}$/),
  beneficiaryBankCode: z.string().min(6),
  provider: providerSchema,
});

export async function registerProviderWorkflowRoutes(app: FastifyInstance) {
  app.post("/v1/funding/intents", async (request, reply) => {
    const parsed = fundingSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const session = requireCustomerSession(request.headers.authorization);
      const intent = createFundingIntent({ ...parsed.data, customerId: session.customerId });
      appendAuditEvent({
        actorId: session.customerId,
        actorRole: "customer",
        action: "funding.intent_create",
        entityType: "funding_intent",
        entityId: intent.id,
        message: `Funding intent ${intent.reference} created for provider confirmation.`,
        metadata: { amountKobo: intent.amountKobo },
      });
      queueNotification({
        customerId: session.customerId,
        channel: "in_app",
        subject: "Funding intent created",
        body: "A sandbox funding intent is waiting for provider confirmation.",
        relatedEntityType: "funding_intent",
        relatedEntityId: intent.id,
      });
      return reply.code(201).send({ data: intent });
    } catch (error) {
      return reply.code(401).send({ error: "CUSTOMER_AUTH_REQUIRED", message: (error as Error).message });
    }
  });

  app.post("/v1/payouts/dispatches", async (request, reply) => {
    const parsed = payoutSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const session = requireCustomerSession(request.headers.authorization);
      const account = store.accounts.find((entry) => entry.id === parsed.data.sourceAccountId);

      if (!account || account.customerId !== session.customerId) {
        return reply.code(403).send({ error: "PAYOUT_DENIED", message: "Source account does not belong to the authenticated customer." });
      }

      if (account.status !== "active" || account.availableBalanceKobo < parsed.data.amountKobo) {
        return reply.code(409).send({ error: "PAYOUT_NOT_READY", message: "Source account cannot fund this payout dispatch." });
      }

      const dispatch = createPayoutDispatch({ ...parsed.data, customerId: session.customerId });
      appendAuditEvent({
        actorId: session.customerId,
        actorRole: "customer",
        action: "payout.dispatch_create",
        entityType: "payout_dispatch",
        entityId: dispatch.id,
        message: `Payout dispatch ${dispatch.reference} prepared for provider handoff.`,
        metadata: { amountKobo: dispatch.amountKobo },
      });
      return reply.code(201).send({ data: dispatch });
    } catch (error) {
      return reply.code(401).send({ error: "CUSTOMER_AUTH_REQUIRED", message: (error as Error).message });
    }
  });

  app.get("/v1/admin/reconciliation/summary", async (request, reply) => {
    try {
      requireAdminPermission(request.headers.authorization, "audit:read");
      return { data: buildReconciliationSummary() };
    } catch (error) {
      return reply.code(403).send({ error: "RECONCILIATION_DENIED", message: (error as Error).message });
    }
  });
}
