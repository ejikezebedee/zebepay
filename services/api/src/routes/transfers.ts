import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getBankingRepositories } from "../repositories/repositoryProvider.js";
import { createPostgresTransfer } from "../services/postgresTransferService.js";
import { requireCustomerSession } from "../services/sessionAuth.js";
import { createTransfer } from "../services/transfers.js";

const transferSchema = z.object({
  sourceAccountId: z.string().min(1),
  amountKobo: z.number().int().positive(),
  beneficiaryName: z.string().min(2),
  beneficiaryAccountNumber: z.string().regex(/^\d{10}$/),
  beneficiaryBankCode: z.string().min(6),
  narration: z.string().max(120).default("Zebepay transfer"),
  channel: z.enum(["internal", "nip_mock", "manual_review"]).default("nip_mock"),
  idempotencyKey: z.string().min(12),
  customerDeviceId: z.string().min(1).optional(),
  otpChallengeId: z.string().min(1).optional(),
});

export async function registerTransferRoutes(app: FastifyInstance) {
  app.get("/v1/transfers", async (request, reply) => {
    try {
      const session = requireCustomerSession(request.headers.authorization);
      const repositories = getBankingRepositories();
      const accounts = await repositories.accounts.listCustomerAccounts(session.customerId);
      return { data: await repositories.transfers.listBySourceAccounts(accounts.map((account) => account.id)) };
    } catch (error) {
      return reply.code(401).send({ error: "CUSTOMER_AUTH_REQUIRED", message: (error as Error).message });
    }
  });

  app.post("/v1/transfers", async (request, reply) => {
    const parsed = transferSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      });
    }

    try {
      const session = requireCustomerSession(request.headers.authorization);
      if (getBankingRepositories().mode === "postgres") {
        if (process.env.ZEBEPAY_POSTGRES_TRANSFER_WRITES !== "enabled") {
          return reply.code(503).send({
            error: "TRANSFER_CUTOVER_REQUIRED",
            message: "Transfer creation is blocked in PostgreSQL mode until ZEBEPAY_POSTGRES_TRANSFER_WRITES=enabled.",
          });
        }

        const transfer = await createPostgresTransfer({ ...parsed.data, customerId: session.customerId });
        const statusCode = transfer.status === "failed" ? 409 : 201;
        return reply.code(statusCode).send({ data: transfer });
      }

      const transfer = createTransfer({ ...parsed.data, customerId: session.customerId });
      const statusCode = transfer.status === "failed" ? 409 : 201;
      return reply.code(statusCode).send({ data: transfer });
    } catch (error) {
      const message = (error as Error).message;
      const isAuthFailure = /session|Customer session/i.test(message);
      return reply
        .code(isAuthFailure ? 401 : 409)
        .send({ error: isAuthFailure ? "CUSTOMER_AUTH_REQUIRED" : "TRANSFER_NOT_ACCEPTED", message });
    }
  });
}
