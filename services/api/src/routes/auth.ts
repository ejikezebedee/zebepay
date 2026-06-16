import type { FastifyInstance } from "fastify";
import type { AdminUser } from "@zebepay/shared";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { z } from "zod";
import { store } from "../data/store.js";
import { getBankingRepositories } from "../repositories/repositoryProvider.js";
import { createPostgresPool } from "../repositories/postgresAdapter.js";
import { appendAuditEvent } from "../services/audit.js";
import { verifySandboxPassword } from "../services/sandboxCrypto.js";
import { createSessionToken } from "../services/sessionAuth.js";
import { getStorageMode } from "../services/storageReadiness.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

let authPool: pg.Pool | undefined;

function getAuthPool(): pg.Pool {
  if (!authPool) {
    authPool = createPostgresPool();
  }

  return authPool;
}

function makeAuditId(): string {
  return `aud_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

function redactAdmin(admin: AdminUser) {
  const { passwordHash: _passwordHash, ...safeAdmin } = admin;
  return safeAdmin;
}

function mapPostgresAdmin(row: Record<string, unknown>): AdminUser {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: row.role as AdminUser["role"],
    passwordHash: String(row.password_hash),
    active: Boolean(row.active),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

async function findAdminByEmail(email: string): Promise<AdminUser | undefined> {
  if (getStorageMode() !== "postgres") {
    return store.adminUsers.find((entry) => entry.email === email && entry.active);
  }

  const result = await getAuthPool().query("SELECT * FROM admin_users WHERE email = $1 AND active = true LIMIT 1", [email]);
  return result.rows[0] ? mapPostgresAdmin(result.rows[0]) : undefined;
}

async function appendAuthAuditEvent(input: {
  actorId: string;
  actorRole: "customer" | AdminUser["role"];
  entityType: string;
  entityId: string;
  message: string;
}): Promise<void> {
  if (getStorageMode() !== "postgres") {
    appendAuditEvent({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: "auth.login",
      entityType: input.entityType,
      entityId: input.entityId,
      message: input.message,
    });
    return;
  }

  await getAuthPool().query(
    `INSERT INTO audit_events (id, actor_id, actor_role, action, severity, entity_type, entity_id, message, metadata, created_at)
     VALUES ($1, $2, $3, 'auth.login', 'info', $4, $5, $6, '{}'::jsonb, $7)`,
    [makeAuditId(), input.actorId, input.actorRole, input.entityType, input.entityId, input.message, new Date().toISOString()],
  );
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/v1/auth/customer/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    const repositories = getBankingRepositories();
    const user = await repositories.customers.findCustomerUserByEmail(parsed.data.email);
    const customer = user ? await repositories.customers.findCustomerById(user.customerId) : undefined;

    if (!user || !customer || !verifySandboxPassword(parsed.data.password, user.passwordHash)) {
      return reply.code(401).send({ error: "INVALID_CREDENTIALS" });
    }

    await appendAuthAuditEvent({
      actorId: customer.id,
      actorRole: "customer",
      entityType: "customer",
      entityId: customer.id,
      message: `${customer.firstName} ${customer.lastName} authenticated into the customer portal.`,
    });

    return {
      data: {
        customer,
        session: {
          tokenType: "Bearer",
          accessToken: createSessionToken({ kind: "customer", customerId: customer.id, userId: user.id }),
          expiresInSeconds: 900,
        },
      },
    };
  });

  app.post("/v1/auth/admin/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(422).send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    const admin = await findAdminByEmail(parsed.data.email);

    if (!admin || !verifySandboxPassword(parsed.data.password, admin.passwordHash)) {
      return reply.code(401).send({ error: "INVALID_CREDENTIALS" });
    }

    await appendAuthAuditEvent({
      actorId: admin.id,
      actorRole: admin.role,
      entityType: "admin_user",
      entityId: admin.id,
      message: `${admin.name} authenticated into the admin console.`,
    });

    return {
      data: {
        admin: redactAdmin(admin),
        session: {
          tokenType: "Bearer",
          accessToken: createSessionToken({ kind: "admin", adminId: admin.id, role: admin.role }),
          expiresInSeconds: 900,
        },
      },
    };
  });
}
