import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { findNigerianBank, isValidNubanLikeAccount } from "@zebepay/shared";
import { getBankingRepositories } from "../repositories/repositoryProvider.js";
import { appendAuditEvent } from "../services/audit.js";
import { requireCustomerSession } from "../services/sessionAuth.js";

const beneficiarySchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(2).max(80),
  accountNumber: z.string().regex(/^\d{10}$/),
  bankCode: z.string().min(6),
});

export async function registerBeneficiaryRoutes(app: FastifyInstance) {
  app.get("/v1/customers/:customerId/beneficiaries", async (request, reply) => {
    const { customerId } = request.params as { customerId: string };
    try {
      const session = requireCustomerSession(request.headers.authorization);
      if (session.customerId !== customerId) {
        return reply.code(403).send({ error: "CUSTOMER_READ_DENIED", message: "Customer session cannot access another customer." });
      }
    } catch (error) {
      return reply.code(401).send({ error: "CUSTOMER_AUTH_REQUIRED", message: (error as Error).message });
    }
    return { data: await getBankingRepositories().beneficiaries.listByCustomer(customerId) };
  });

  app.post("/v1/beneficiaries", async (request, reply) => {
    const parsed = beneficiarySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    if (!isValidNubanLikeAccount(parsed.data.accountNumber) || !findNigerianBank(parsed.data.bankCode)) {
      return reply.code(422).send({ error: "INVALID_BENEFICIARY_BANK_DETAILS" });
    }

    let customerId: string;
    try {
      customerId = requireCustomerSession(request.headers.authorization).customerId;
      if (parsed.data.customerId !== customerId) {
        return reply.code(403).send({ error: "CUSTOMER_WRITE_DENIED", message: "Customer session cannot create another customer's beneficiary." });
      }
    } catch (error) {
      return reply.code(401).send({ error: "CUSTOMER_AUTH_REQUIRED", message: (error as Error).message });
    }

    const beneficiary = await getBankingRepositories().beneficiaries.create({
      id: "",
      customerId,
      name: parsed.data.name,
      accountNumber: parsed.data.accountNumber,
      bankCode: parsed.data.bankCode,
      bankName: "",
      status: "active",
      createdAt: "",
    });

    appendAuditEvent({
      actorId: beneficiary.customerId,
      actorRole: "customer",
      action: "beneficiary.create",
      entityType: "beneficiary",
      entityId: beneficiary.id,
      message: `Beneficiary ${beneficiary.name} created.`,
      metadata: { bankCode: beneficiary.bankCode },
    });

    return reply.code(201).send({ data: beneficiary });
  });

  app.delete("/v1/customers/:customerId/beneficiaries/:beneficiaryId", async (request, reply) => {
    const { customerId, beneficiaryId } = request.params as { customerId: string; beneficiaryId: string };

    try {
      const session = requireCustomerSession(request.headers.authorization);
      if (session.customerId !== customerId) {
        return reply.code(403).send({ error: "CUSTOMER_WRITE_DENIED", message: "Customer session cannot disable another customer's beneficiary." });
      }
    } catch (error) {
      return reply.code(401).send({ error: "CUSTOMER_AUTH_REQUIRED", message: (error as Error).message });
    }

    try {
      const beneficiary = await getBankingRepositories().beneficiaries.disable(customerId, beneficiaryId);
      appendAuditEvent({
        actorId: customerId,
        actorRole: "customer",
        action: "beneficiary.disable",
        entityType: "beneficiary",
        entityId: beneficiary.id,
        message: `Beneficiary ${beneficiary.name} disabled.`,
      });
      return { data: beneficiary };
    } catch (error) {
      return reply.code(404).send({ error: "BENEFICIARY_NOT_FOUND", message: (error as Error).message });
    }
  });
}
