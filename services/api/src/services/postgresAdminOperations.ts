import {
  rolePermissions,
  type AccountControlRecord,
  type AdminRole,
  type AdminUser,
  type BankAccount,
  type CustomerProfile,
  type KycReviewCase,
  type KycReviewDecision,
  type KycTier,
  type TransferRecord,
} from "@zebepay/shared";
import type pg from "pg";
import { createPostgresPool, withPostgresTransaction } from "../repositories/postgresAdapter.js";
import { mapTransfer, type PostgresQueryable } from "../repositories/postgresRepositories.js";

type Row = Record<string, unknown>;

let adminPool: pg.Pool | undefined;

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function can(role: AdminRole, permission: string): boolean {
  const permissions = rolePermissions[role] ?? [];
  return permissions.includes("*") || permissions.includes(permission);
}

function kycAuditAction(decision: KycReviewDecision) {
  return decision === "approved" ? "kyc.approve" : decision === "rejected" ? "kyc.reject" : "kyc.needs_more_info";
}

function mapAdminUser(row: Row): AdminUser {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    role: row.role as AdminRole,
    active: Boolean(row.active),
    createdAt: toIso(row.created_at),
  };
}

function mapAccount(row: Row): BankAccount {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    accountNumber: String(row.account_number),
    accountName: String(row.account_name),
    currency: "NGN",
    balanceKobo: toNumber(row.balance_kobo),
    availableBalanceKobo: toNumber(row.available_balance_kobo),
    status: row.status as BankAccount["status"],
    createdAt: toIso(row.created_at),
  };
}

function mapCustomer(row: Row): CustomerProfile {
  return {
    id: String(row.id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    phone: String(row.phone),
    email: String(row.email),
    kycTier: row.kyc_tier as KycTier,
    kycStatus: row.kyc_status as CustomerProfile["kycStatus"],
    bvnLast4: row.bvn_last4 ? String(row.bvn_last4) : undefined,
    ninLast4: row.nin_last4 ? String(row.nin_last4) : undefined,
    createdAt: toIso(row.created_at),
  };
}

function mapControl(row: Row): AccountControlRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    action: row.action as AccountControlRecord["action"],
    reason: String(row.reason),
    actorId: String(row.actor_id),
    createdAt: toIso(row.created_at),
  };
}

function mapKycReview(row: Row): KycReviewCase {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    status: row.status as CustomerProfile["kycStatus"],
    submittedTier: row.submitted_tier as KycTier,
    assignedTo: row.assigned_to ? String(row.assigned_to) : undefined,
    decision: row.decision ? (row.decision as KycReviewDecision) : undefined,
    decisionReason: row.decision_reason ? String(row.decision_reason) : undefined,
    createdAt: toIso(row.created_at),
    decidedAt: row.decided_at ? toIso(row.decided_at) : undefined,
  };
}

async function requirePostgresPermission(db: PostgresQueryable, actorId: string, permission: string): Promise<AdminUser> {
  const result = await db.query("SELECT * FROM admin_users WHERE id = $1 AND active = true LIMIT 1", [actorId]);
  const actor = result.rows[0] ? mapAdminUser(result.rows[0]) : undefined;

  if (!actor) {
    throw new Error("Admin actor was not found or is inactive.");
  }

  if (!can(actor.role, permission)) {
    throw new Error(`Admin role ${actor.role} cannot perform ${permission}.`);
  }

  return actor;
}

async function insertAuditEvent(
  db: PostgresQueryable,
  input: {
    actor: AdminUser;
    action: string;
    severity?: string;
    entityType: string;
    entityId: string;
    message: string;
    metadata?: Record<string, string | number | boolean | null>;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO audit_events (id, actor_id, actor_role, action, severity, entity_type, entity_id, message, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
    [
      makeId("aud"),
      input.actor.id,
      input.actor.role,
      input.action,
      input.severity ?? "info",
      input.entityType,
      input.entityId,
      input.message,
      JSON.stringify(input.metadata ?? {}),
      new Date().toISOString(),
    ],
  );
}

async function insertNotification(
  db: PostgresQueryable,
  input: {
    customerId?: string;
    subject: string;
    body: string;
    relatedEntityType: string;
    relatedEntityId: string;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO notifications (
       id, customer_id, channel, status, subject, body, related_entity_type, related_entity_id, created_at
     )
     VALUES ($1, $2, 'in_app', 'queued', $3, $4, $5, $6, $7)`,
    [
      makeId("ntf"),
      input.customerId ?? null,
      input.subject,
      input.body,
      input.relatedEntityType,
      input.relatedEntityId,
      new Date().toISOString(),
    ],
  );
}

export async function listPostgresHeldTransfers(db: PostgresQueryable): Promise<TransferRecord[]> {
  const result = await db.query("SELECT * FROM transfers WHERE status = 'requires_review' ORDER BY created_at ASC");
  return result.rows.map(mapTransfer);
}

export async function setPostgresAccountStatusInsideTransaction(
  db: PostgresQueryable,
  accountId: string,
  action: "freeze" | "unfreeze",
  reason: string,
  actorId: string,
): Promise<{ account: BankAccount; control: AccountControlRecord }> {
  const actor = await requirePostgresPermission(db, actorId, "accounts:freeze");
  const status = action === "freeze" ? "frozen" : "active";
  const accountResult = await db.query("UPDATE accounts SET status = $1 WHERE id = $2 RETURNING *", [status, accountId]);

  if (!accountResult.rows[0]) {
    throw new Error("Account was not found.");
  }

  const controlResult = await db.query(
    `INSERT INTO account_controls (id, account_id, action, reason, actor_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [makeId("ctrl"), accountId, action, reason, actor.id, new Date().toISOString()],
  );

  await insertAuditEvent(db, {
    actor,
    action: action === "freeze" ? "account.freeze" : "account.unfreeze",
    severity: action === "freeze" ? "warning" : "info",
    entityType: "account",
    entityId: accountId,
    message: `Account ${action} applied by ${actor.name}.`,
    metadata: { reason },
  });

  return { account: mapAccount(accountResult.rows[0]), control: mapControl(controlResult.rows[0]) };
}

export async function decidePostgresKycReviewInsideTransaction(
  db: PostgresQueryable,
  customerId: string,
  decision: KycReviewDecision,
  approvedTier: KycTier,
  reason: string,
  actorId: string,
): Promise<{ customer: CustomerProfile; review: KycReviewCase }> {
  const actor = await requirePostgresPermission(db, actorId, "kyc:write");
  const now = new Date().toISOString();
  const status = decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "pending_review";
  const customerResult = await db.query(
    `UPDATE customers
     SET kyc_status = $1, kyc_tier = CASE WHEN $2 = 'approved' THEN $3 ELSE kyc_tier END
     WHERE id = $4
     RETURNING *`,
    [status, decision, approvedTier, customerId],
  );

  if (!customerResult.rows[0]) {
    throw new Error("Customer was not found.");
  }

  const existingReview = await db.query("SELECT id, created_at FROM kyc_review_cases WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1", [
    customerId,
  ]);
  const reviewId = existingReview.rows[0] ? String(existingReview.rows[0].id) : makeId("kyc");
  const createdAt = existingReview.rows[0] ? toIso(existingReview.rows[0].created_at) : now;
  const reviewResult = await db.query(
    `INSERT INTO kyc_review_cases (
       id, customer_id, status, submitted_tier, assigned_to, decision, decision_reason, created_at, decided_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       submitted_tier = EXCLUDED.submitted_tier,
       assigned_to = EXCLUDED.assigned_to,
       decision = EXCLUDED.decision,
       decision_reason = EXCLUDED.decision_reason,
       decided_at = EXCLUDED.decided_at
     RETURNING *`,
    [reviewId, customerId, status, approvedTier, actor.id, decision, reason, createdAt, now],
  );

  await insertAuditEvent(db, {
    actor,
    action: kycAuditAction(decision),
    severity: decision === "approved" ? "info" : "warning",
    entityType: "customer",
    entityId: customerId,
    message: `KYC review ${decision} by ${actor.name}.`,
    metadata: { reason, approvedTier },
  });

  return { customer: mapCustomer(customerResult.rows[0]), review: mapKycReview(reviewResult.rows[0]) };
}

export async function releasePostgresHeldTransferInsideTransaction(
  db: PostgresQueryable,
  transferId: string,
  actorId: string,
): Promise<TransferRecord> {
  const actor = await requirePostgresPermission(db, actorId, "transfers:review");
  const transferResult = await db.query("SELECT * FROM transfers WHERE id = $1 FOR UPDATE", [transferId]);
  const transfer = transferResult.rows[0];

  if (!transfer) {
    throw new Error("Transfer was not found.");
  }

  if (String(transfer.status) !== "requires_review") {
    throw new Error("Only transfers requiring review can be released.");
  }

  const accountResult = await db.query("SELECT * FROM accounts WHERE id = $1 FOR UPDATE", [transfer.source_account_id]);
  const account = accountResult.rows[0];

  if (!account || toNumber(account.available_balance_kobo) < toNumber(transfer.amount_kobo)) {
    throw new Error("Source account cannot fund the transfer.");
  }

  if (String(account.status) !== "active") {
    throw new Error("Source account must be active before a held transfer can be released.");
  }

  const balanceAfterKobo = toNumber(account.balance_kobo) - toNumber(transfer.amount_kobo);
  const availableAfterKobo = toNumber(account.available_balance_kobo) - toNumber(transfer.amount_kobo);
  const now = new Date().toISOString();

  await db.query("UPDATE accounts SET balance_kobo = $1, available_balance_kobo = $2 WHERE id = $3", [
    balanceAfterKobo,
    availableAfterKobo,
    account.id,
  ]);
  await db.query(
    `INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount_kobo, balance_after_kobo, narration, created_at)
     VALUES ($1, $2, $3, 'debit', $4, $5, $6, $7)`,
    [makeId("led"), transferId, account.id, transfer.amount_kobo, balanceAfterKobo, transfer.narration, now],
  );
  const saved = await db.query(
    `UPDATE transfers
     SET status = 'successful', failure_reason = NULL, completed_at = $1, reviewed_by = $2, reviewed_at = $1
     WHERE id = $3
     RETURNING *`,
    [now, actor.id, transferId],
  );

  await insertAuditEvent(db, {
    actor,
    action: "transfer.release",
    entityType: "transfer",
    entityId: transferId,
    message: `Held transfer ${String(transfer.reference)} released by ${actor.name}.`,
    metadata: { riskScore: toNumber(transfer.risk_score), riskLevel: String(transfer.risk_level) },
  });
  await insertNotification(db, {
    customerId: String(account.customer_id),
    subject: "Transfer released",
    body: "Your held transfer has been released successfully.",
    relatedEntityType: "transfer",
    relatedEntityId: transferId,
  });

  return mapTransfer(saved.rows[0]);
}

export async function rejectPostgresHeldTransferInsideTransaction(
  db: PostgresQueryable,
  transferId: string,
  reason: string,
  actorId: string,
): Promise<TransferRecord> {
  const actor = await requirePostgresPermission(db, actorId, "transfers:review");
  const now = new Date().toISOString();
  const saved = await db.query(
    `UPDATE transfers
     SET status = 'failed', failure_reason = $1, reviewed_by = $2, reviewed_at = $3
     WHERE id = $4 AND status = 'requires_review'
     RETURNING *`,
    [reason, actor.id, now, transferId],
  );

  if (!saved.rows[0]) {
    throw new Error("Only transfers requiring review can be rejected.");
  }

  await insertAuditEvent(db, {
    actor,
    action: "transfer.reject",
    severity: "warning",
    entityType: "transfer",
    entityId: transferId,
    message: `Held transfer ${String(saved.rows[0].reference)} rejected by ${actor.name}.`,
    metadata: { reason, riskScore: toNumber(saved.rows[0].risk_score), riskLevel: String(saved.rows[0].risk_level) },
  });
  await insertNotification(db, {
    customerId: saved.rows[0].customer_id ? String(saved.rows[0].customer_id) : undefined,
    subject: "Transfer rejected",
    body: "Your held transfer was rejected after security review.",
    relatedEntityType: "transfer",
    relatedEntityId: transferId,
  });

  return mapTransfer(saved.rows[0]);
}

export async function reversePostgresTransferInsideTransaction(
  db: PostgresQueryable,
  transferId: string,
  reason: string,
  actorId: string,
): Promise<TransferRecord> {
  const actor = await requirePostgresPermission(db, actorId, "transfers:reverse");
  const transferResult = await db.query("SELECT * FROM transfers WHERE id = $1 FOR UPDATE", [transferId]);
  const transfer = transferResult.rows[0];

  if (!transfer) {
    throw new Error("Transfer was not found.");
  }

  if (String(transfer.status) !== "successful") {
    throw new Error("Only successful transfers can be reversed.");
  }

  const accountResult = await db.query("SELECT * FROM accounts WHERE id = $1 FOR UPDATE", [transfer.source_account_id]);
  const account = accountResult.rows[0];

  if (!account) {
    throw new Error("Source account was not found.");
  }

  const balanceAfterKobo = toNumber(account.balance_kobo) + toNumber(transfer.amount_kobo);
  const availableAfterKobo = toNumber(account.available_balance_kobo) + toNumber(transfer.amount_kobo);
  const now = new Date().toISOString();

  await db.query("UPDATE accounts SET balance_kobo = $1, available_balance_kobo = $2 WHERE id = $3", [
    balanceAfterKobo,
    availableAfterKobo,
    account.id,
  ]);
  await db.query(
    `INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount_kobo, balance_after_kobo, narration, created_at)
     VALUES ($1, $2, $3, 'credit', $4, $5, $6, $7)`,
    [makeId("led"), `${transferId}_reversal`, account.id, transfer.amount_kobo, balanceAfterKobo, `Reversal: ${reason}`, now],
  );
  const saved = await db.query(
    `UPDATE transfers
     SET status = 'reversed', reversed_at = $1, reversal_reason = $2
     WHERE id = $3
     RETURNING *`,
    [now, reason, transferId],
  );

  await insertAuditEvent(db, {
    actor,
    action: "transfer.reverse",
    severity: "warning",
    entityType: "transfer",
    entityId: transferId,
    message: `Transfer ${String(transfer.reference)} reversed by ${actor.name}.`,
    metadata: { reason, amountKobo: toNumber(transfer.amount_kobo) },
  });

  return mapTransfer(saved.rows[0]);
}

function getAdminPool(): pg.Pool {
  if (!adminPool) {
    adminPool = createPostgresPool();
  }

  return adminPool;
}

export async function listPostgresReviewQueue(): Promise<TransferRecord[]> {
  const pool = getAdminPool();
  const result = await pool.query("SELECT * FROM transfers WHERE status = 'requires_review' ORDER BY created_at ASC");
  return result.rows.map(mapTransfer);
}

export async function setPostgresAccountStatus(accountId: string, action: "freeze" | "unfreeze", reason: string, actorId: string) {
  return withPostgresTransaction(getAdminPool(), (client) =>
    setPostgresAccountStatusInsideTransaction(client, accountId, action, reason, actorId),
  );
}

export async function decidePostgresKycReview(
  customerId: string,
  decision: KycReviewDecision,
  approvedTier: KycTier,
  reason: string,
  actorId: string,
) {
  return withPostgresTransaction(getAdminPool(), (client) =>
    decidePostgresKycReviewInsideTransaction(client, customerId, decision, approvedTier, reason, actorId),
  );
}

export async function releasePostgresHeldTransfer(transferId: string, actorId: string): Promise<TransferRecord> {
  return withPostgresTransaction(getAdminPool(), (client) => releasePostgresHeldTransferInsideTransaction(client, transferId, actorId));
}

export async function rejectPostgresHeldTransfer(transferId: string, reason: string, actorId: string): Promise<TransferRecord> {
  return withPostgresTransaction(getAdminPool(), (client) =>
    rejectPostgresHeldTransferInsideTransaction(client, transferId, reason, actorId),
  );
}

export async function reversePostgresTransfer(transferId: string, reason: string, actorId: string): Promise<TransferRecord> {
  return withPostgresTransaction(getAdminPool(), (client) => reversePostgresTransferInsideTransaction(client, transferId, reason, actorId));
}
