import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { store } from "../data/store.js";
import { decideKycReview, setAccountStatus } from "../services/adminOperations.js";
import { listAuditEvents } from "../services/audit.js";
import {
  decidePostgresKycReview,
  listPostgresReviewQueue,
  rejectPostgresHeldTransfer,
  releasePostgresHeldTransfer,
  reversePostgresTransfer,
  setPostgresAccountStatus,
} from "../services/postgresAdminOperations.js";
import { requireAdminPermission, requireAdminSession } from "../services/sessionAuth.js";
import { buildProductionReadinessReport, buildStorageStatus, getStorageMode } from "../services/storageReadiness.js";
import { rejectHeldTransfer, releaseHeldTransfer, reverseTransfer } from "../services/transfers.js";

const reasonSchema = z.object({
  reason: z.string().min(8).max(240),
});

const kycDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected", "needs_more_info"]),
  approvedTier: z.enum(["tier_0", "tier_1", "tier_2", "tier_3"]).default("tier_1"),
  reason: z.string().min(8).max(240),
});

function getAdminActorId(request: { headers: Record<string, string | string[] | undefined> }): string {
  return requireAdminSession(request.headers.authorization as string | undefined).adminId;
}

function redactAdminUsers() {
  return store.adminUsers.map(({ passwordHash: _passwordHash, ...admin }) => admin);
}

function adminWritesUsePostgres() {
  return getStorageMode() === "postgres";
}

function postgresAdminWritesEnabled() {
  return process.env.ZEBEPAY_POSTGRES_ADMIN_WRITES === "enabled";
}

function sendPostgresAdminWriteGate(reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }) {
  return reply.code(503).send({
    error: "ADMIN_WRITE_CUTOVER_REQUIRED",
    message: "Admin writes are blocked in PostgreSQL mode until ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled.",
  });
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get("/v1/admin/users", async (request, reply) => {
    try {
      requireAdminPermission(request.headers.authorization as string | undefined, "customers:read");
      return { data: redactAdminUsers() };
    } catch (error) {
      return reply.code(403).send({ error: "ADMIN_OPERATION_DENIED", message: (error as Error).message });
    }
  });

  app.get("/v1/admin/audit-events", async (request, reply) => {
    try {
      requireAdminPermission(request.headers.authorization as string | undefined, "audit:read");
      return { data: listAuditEvents() };
    } catch (error) {
      return reply.code(403).send({ error: "ADMIN_OPERATION_DENIED", message: (error as Error).message });
    }
  });

  app.get("/v1/admin/storage/status", async (request, reply) => {
    try {
      requireAdminPermission(request.headers.authorization as string | undefined, "audit:read");
      return { data: buildStorageStatus() };
    } catch (error) {
      return reply.code(403).send({ error: "STORAGE_STATUS_DENIED", message: (error as Error).message });
    }
  });

  app.get("/v1/admin/production-readiness", async (request, reply) => {
    try {
      requireAdminPermission(request.headers.authorization as string | undefined, "audit:read");
      return { data: buildProductionReadinessReport() };
    } catch (error) {
      return reply.code(403).send({ error: "PRODUCTION_READINESS_DENIED", message: (error as Error).message });
    }
  });

  app.get("/v1/admin/kyc-reviews", async (request, reply) => {
    try {
      requireAdminPermission(request.headers.authorization as string | undefined, "kyc:read");
      return { data: store.kycReviewCases };
    } catch (error) {
      return reply.code(403).send({ error: "ADMIN_OPERATION_DENIED", message: (error as Error).message });
    }
  });

  app.post("/v1/admin/accounts/:accountId/freeze", async (request, reply) => {
    const { accountId } = request.params as { accountId: string };
    const parsed = reasonSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      if (adminWritesUsePostgres()) {
        if (!postgresAdminWritesEnabled()) {
          return sendPostgresAdminWriteGate(reply);
        }

        return { data: await setPostgresAccountStatus(accountId, "freeze", parsed.data.reason, getAdminActorId(request)) };
      }

      return { data: setAccountStatus(accountId, "freeze", parsed.data.reason, getAdminActorId(request)) };
    } catch (error) {
      return reply.code(403).send({ error: "ADMIN_OPERATION_DENIED", message: (error as Error).message });
    }
  });

  app.post("/v1/admin/accounts/:accountId/unfreeze", async (request, reply) => {
    const { accountId } = request.params as { accountId: string };
    const parsed = reasonSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      if (adminWritesUsePostgres()) {
        if (!postgresAdminWritesEnabled()) {
          return sendPostgresAdminWriteGate(reply);
        }

        return { data: await setPostgresAccountStatus(accountId, "unfreeze", parsed.data.reason, getAdminActorId(request)) };
      }

      return { data: setAccountStatus(accountId, "unfreeze", parsed.data.reason, getAdminActorId(request)) };
    } catch (error) {
      return reply.code(403).send({ error: "ADMIN_OPERATION_DENIED", message: (error as Error).message });
    }
  });

  app.post("/v1/admin/customers/:customerId/kyc-decision", async (request, reply) => {
    const { customerId } = request.params as { customerId: string };
    const parsed = kycDecisionSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      if (adminWritesUsePostgres()) {
        if (!postgresAdminWritesEnabled()) {
          return sendPostgresAdminWriteGate(reply);
        }

        return {
          data: await decidePostgresKycReview(
            customerId,
            parsed.data.decision,
            parsed.data.approvedTier,
            parsed.data.reason,
            getAdminActorId(request),
          ),
        };
      }

      return {
        data: decideKycReview(
          customerId,
          parsed.data.decision,
          parsed.data.approvedTier,
          parsed.data.reason,
          getAdminActorId(request),
        ),
      };
    } catch (error) {
      return reply.code(403).send({ error: "ADMIN_OPERATION_DENIED", message: (error as Error).message });
    }
  });

  app.post("/v1/admin/transfers/:transferId/reverse", async (request, reply) => {
    const { transferId } = request.params as { transferId: string };
    const parsed = reasonSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      if (adminWritesUsePostgres()) {
        if (!postgresAdminWritesEnabled()) {
          return sendPostgresAdminWriteGate(reply);
        }

        return { data: await reversePostgresTransfer(transferId, parsed.data.reason, getAdminActorId(request)) };
      }

      return { data: reverseTransfer(transferId, parsed.data.reason, getAdminActorId(request)) };
    } catch (error) {
      return reply.code(403).send({ error: "ADMIN_OPERATION_DENIED", message: (error as Error).message });
    }
  });

  app.get("/v1/admin/transfers/review-queue", async (request, reply) => {
    try {
      requireAdminPermission(request.headers.authorization as string | undefined, "transfers:read");
      if (getStorageMode() === "postgres") {
        return { data: await listPostgresReviewQueue() };
      }

      return { data: store.transfers.filter((transfer) => transfer.status === "requires_review") };
    } catch (error) {
      return reply.code(403).send({ error: "ADMIN_OPERATION_DENIED", message: (error as Error).message });
    }
  });

  app.post("/v1/admin/transfers/:transferId/release", async (request, reply) => {
    const { transferId } = request.params as { transferId: string };

    try {
      if (adminWritesUsePostgres()) {
        if (!postgresAdminWritesEnabled()) {
          return sendPostgresAdminWriteGate(reply);
        }

        return { data: await releasePostgresHeldTransfer(transferId, getAdminActorId(request)) };
      }

      return { data: releaseHeldTransfer(transferId, getAdminActorId(request)) };
    } catch (error) {
      return reply.code(403).send({ error: "ADMIN_OPERATION_DENIED", message: (error as Error).message });
    }
  });

  app.post("/v1/admin/transfers/:transferId/reject", async (request, reply) => {
    const { transferId } = request.params as { transferId: string };
    const parsed = reasonSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      if (adminWritesUsePostgres()) {
        if (!postgresAdminWritesEnabled()) {
          return sendPostgresAdminWriteGate(reply);
        }

        return { data: await rejectPostgresHeldTransfer(transferId, parsed.data.reason, getAdminActorId(request)) };
      }

      return { data: rejectHeldTransfer(transferId, parsed.data.reason, getAdminActorId(request)) };
    } catch (error) {
      return reply.code(403).send({ error: "ADMIN_OPERATION_DENIED", message: (error as Error).message });
    }
  });
}
