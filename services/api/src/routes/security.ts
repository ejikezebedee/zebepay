import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createOtpChallengeForCustomer,
  registerTrustedDeviceForCustomer,
  verifyOtpChallengeForCustomer,
} from "../services/security.js";
import { requireCustomerSession } from "../services/sessionAuth.js";

const deviceSchema = z.object({
  label: z.string().min(2).max(80),
  fingerprint: z.string().min(12).max(160),
});

const otpCreateSchema = z.object({
  purpose: z.enum(["login", "transfer", "beneficiary"]),
  targetId: z.string().min(1).optional(),
});

const otpVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export async function registerSecurityRoutes(app: FastifyInstance) {
  app.post("/v1/security/devices/trust", async (request, reply) => {
    const parsed = deviceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const session = requireCustomerSession(request.headers.authorization);
      return { data: await registerTrustedDeviceForCustomer(session.customerId, parsed.data.label, parsed.data.fingerprint) };
    } catch (error) {
      return reply.code(401).send({ error: "CUSTOMER_AUTH_REQUIRED", message: (error as Error).message });
    }
  });

  app.post("/v1/security/otp-challenges", async (request, reply) => {
    const parsed = otpCreateSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const session = requireCustomerSession(request.headers.authorization);
      return reply
        .code(201)
        .send({ data: await createOtpChallengeForCustomer(session.customerId, parsed.data.purpose, parsed.data.targetId) });
    } catch (error) {
      return reply.code(401).send({ error: "CUSTOMER_AUTH_REQUIRED", message: (error as Error).message });
    }
  });

  app.post("/v1/security/otp-challenges/:challengeId/verify", async (request, reply) => {
    const { challengeId } = request.params as { challengeId: string };
    const parsed = otpVerifySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const session = requireCustomerSession(request.headers.authorization);
      return { data: await verifyOtpChallengeForCustomer(challengeId, parsed.data.code, session.customerId) };
    } catch (error) {
      return reply.code(401).send({ error: "OTP_VERIFICATION_FAILED", message: (error as Error).message });
    }
  });
}
