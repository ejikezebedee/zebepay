import type { CustomerDevice, OtpChallenge, OtpPurpose, TransferInstruction, TransferRiskAssessment } from "@zebepay/shared";
import { kycTierDailyLimitsKobo } from "@zebepay/shared";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type pg from "pg";
import { store } from "../data/store.js";
import { createPostgresPool } from "../repositories/postgresAdapter.js";
import { getStorageMode } from "./storageReadiness.js";
import { appendAuditEvent } from "./audit.js";

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type Row = Record<string, unknown>;

let securityPool: pg.Pool | undefined;

function getSecurityPool(): pg.Pool {
  if (!securityPool) {
    securityPool = createPostgresPool();
  }

  return securityPool;
}

function hashOtpCode(code: string): string {
  const pepper = process.env.ZEBEPAY_OTP_HASH_PEPPER ?? process.env.ZEBEPAY_SANDBOX_SESSION_SECRET ?? "zebepay-sandbox-otp-pepper";
  return createHash("sha256").update(`${pepper}:${code}`).digest("hex");
}

function matchesOtpCode(code: string, storedHash: string): boolean {
  const submitted = Buffer.from(hashOtpCode(code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return submitted.length === stored.length && timingSafeEqual(submitted, stored);
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapPostgresDevice(row: Row): CustomerDevice {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    label: String(row.label),
    fingerprint: String(row.fingerprint),
    trusted: Boolean(row.trusted),
    lastSeenAt: toIso(row.last_seen_at),
    createdAt: toIso(row.created_at),
  };
}

function mapPostgresOtp(row: Row): Omit<OtpChallenge, "code"> {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    purpose: row.purpose as OtpPurpose,
    targetId: row.target_id ? String(row.target_id) : undefined,
    verified: Boolean(row.verified),
    expiresAt: toIso(row.expires_at),
    createdAt: toIso(row.created_at),
    verifiedAt: row.verified_at ? toIso(row.verified_at) : undefined,
    consumedAt: row.consumed_at ? toIso(row.consumed_at) : undefined,
  };
}

async function insertPostgresAuditEvent(
  db: pg.Pool,
  input: {
    actorId: string;
    actorRole: "customer" | "system";
    action: "device.trusted" | "otp.challenge_created" | "otp.challenge_verified" | "notification.queue";
    entityType: string;
    entityId: string;
    message: string;
    metadata?: Record<string, string | number | boolean | null>;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO audit_events (id, actor_id, actor_role, action, severity, entity_type, entity_id, message, metadata, created_at)
     VALUES ($1, $2, $3, $4, 'info', $5, $6, $7, $8::jsonb, $9)`,
    [
      makeId("aud"),
      input.actorId,
      input.actorRole,
      input.action,
      input.entityType,
      input.entityId,
      input.message,
      JSON.stringify(input.metadata ?? {}),
      new Date().toISOString(),
    ],
  );
}

async function queuePostgresOtpNotification(db: pg.Pool, customerId: string, challengeId: string, code: string): Promise<void> {
  const notificationId = makeId("ntf");

  await db.query(
    `INSERT INTO notifications (
       id, customer_id, channel, status, subject, body, related_entity_type, related_entity_id, created_at
     )
     VALUES ($1, $2, 'sms', 'queued', $3, $4, 'otp_challenge', $5, $6)`,
    [
      notificationId,
      customerId,
      "Zebepay OTP",
      `Sandbox OTP for challenge ${challengeId}: ${code}. Replace this delivery path with an approved OTP provider before live use.`,
      challengeId,
      new Date().toISOString(),
    ],
  );
  await insertPostgresAuditEvent(db, {
    actorId: customerId,
    actorRole: "customer",
    action: "notification.queue",
    entityType: "otp_challenge",
    entityId: challengeId,
    message: "OTP notification queued through the sandbox delivery channel.",
    metadata: { channel: "sms", notificationId },
  });
}

async function registerPostgresTrustedDevice(customerId: string, label: string, fingerprint: string): Promise<CustomerDevice> {
  const db = getSecurityPool();
  const now = new Date().toISOString();
  const result = await db.query(
    `INSERT INTO customer_devices (id, customer_id, label, fingerprint, trusted, last_seen_at, created_at)
     VALUES ($1, $2, $3, $4, true, $5, $5)
     ON CONFLICT (customer_id, fingerprint) DO UPDATE SET
       label = EXCLUDED.label,
       trusted = true,
       last_seen_at = EXCLUDED.last_seen_at
     RETURNING *`,
    [makeId("dev"), customerId, label, fingerprint, now],
  );
  const device = mapPostgresDevice(result.rows[0]);

  await insertPostgresAuditEvent(db, {
    actorId: customerId,
    actorRole: "customer",
    action: "device.trusted",
    entityType: "customer_device",
    entityId: device.id,
    message: `Trusted device registered: ${label}.`,
  });

  return device;
}

async function createPostgresOtpChallenge(customerId: string, purpose: OtpPurpose, targetId?: string): Promise<Omit<OtpChallenge, "code">> {
  const db = getSecurityPool();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = new Date().toISOString();
  const result = await db.query(
    `INSERT INTO otp_challenges (id, customer_id, purpose, target_id, code_hash, verified, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, false, $6, $7)
     RETURNING *`,
    [makeId("otp"), customerId, purpose, targetId ?? null, hashOtpCode(code), new Date(Date.now() + 5 * 60 * 1000).toISOString(), now],
  );
  const challenge = mapPostgresOtp(result.rows[0]);

  await insertPostgresAuditEvent(db, {
    actorId: customerId,
    actorRole: "customer",
    action: "otp.challenge_created",
    entityType: "otp_challenge",
    entityId: challenge.id,
    message: `OTP challenge created for ${purpose}.`,
  });
  await queuePostgresOtpNotification(db, customerId, challenge.id, code);

  return challenge;
}

async function verifyPostgresOtpChallenge(
  challengeId: string,
  code: string,
  customerId?: string,
): Promise<Omit<OtpChallenge, "code">> {
  const db = getSecurityPool();
  const result = await db.query("SELECT * FROM otp_challenges WHERE id = $1 LIMIT 1", [challengeId]);
  const challenge = result.rows[0];

  if (
    !challenge ||
    (customerId && String(challenge.customer_id) !== customerId) ||
    challenge.consumed_at ||
    !matchesOtpCode(code, String(challenge.code_hash)) ||
    new Date(String(challenge.expires_at)).getTime() < Date.now()
  ) {
    throw new Error("OTP challenge is invalid or expired.");
  }

  const verifiedAt = new Date().toISOString();
  const update = await db.query("UPDATE otp_challenges SET verified = true, verified_at = $1 WHERE id = $2 RETURNING *", [
    verifiedAt,
    challengeId,
  ]);
  const verified = mapPostgresOtp(update.rows[0]);

  await insertPostgresAuditEvent(db, {
    actorId: verified.customerId,
    actorRole: "customer",
    action: "otp.challenge_verified",
    entityType: "otp_challenge",
    entityId: verified.id,
    message: `OTP challenge verified for ${verified.purpose}.`,
  });

  return verified;
}

export function registerTrustedDevice(customerId: string, label: string, fingerprint: string) {
  const existing = store.customerDevices.find(
    (device) => device.customerId === customerId && device.fingerprint === fingerprint,
  );
  const now = new Date().toISOString();

  if (existing) {
    existing.label = label;
    existing.trusted = true;
    existing.lastSeenAt = now;
    return existing;
  }

  const device = {
    id: makeId("dev"),
    customerId,
    label,
    fingerprint,
    trusted: true,
    lastSeenAt: now,
    createdAt: now,
  };

  store.customerDevices.push(device);
  appendAuditEvent({
    actorId: customerId,
    actorRole: "customer",
    action: "device.trusted",
    entityType: "customer_device",
    entityId: device.id,
    message: `Trusted device registered: ${label}.`,
  });

  return device;
}

export async function registerTrustedDeviceForCustomer(customerId: string, label: string, fingerprint: string) {
  if (getStorageMode() === "postgres") {
    return registerPostgresTrustedDevice(customerId, label, fingerprint);
  }

  return registerTrustedDevice(customerId, label, fingerprint);
}

export function createOtpChallenge(customerId: string, purpose: OtpPurpose, targetId?: string) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const challenge = {
    id: makeId("otp"),
    customerId,
    purpose,
    targetId,
    code,
    verified: false,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  store.otpChallenges.push(challenge);
  appendAuditEvent({
    actorId: customerId,
    actorRole: "customer",
    action: "otp.challenge_created",
    entityType: "otp_challenge",
    entityId: challenge.id,
    message: `OTP challenge created for ${purpose}.`,
  });

  return redactOtpChallenge(challenge);
}

export async function createOtpChallengeForCustomer(customerId: string, purpose: OtpPurpose, targetId?: string) {
  if (getStorageMode() === "postgres") {
    return createPostgresOtpChallenge(customerId, purpose, targetId);
  }

  return createOtpChallenge(customerId, purpose, targetId);
}

export function verifyOtpChallenge(challengeId: string, code: string, customerId?: string) {
  const challenge = store.otpChallenges.find((entry) => entry.id === challengeId);

  if (
    !challenge ||
    (customerId && challenge.customerId !== customerId) ||
    challenge.consumedAt ||
    challenge.code !== code ||
    new Date(challenge.expiresAt).getTime() < Date.now()
  ) {
    throw new Error("OTP challenge is invalid or expired.");
  }

  challenge.verified = true;
  challenge.verifiedAt = new Date().toISOString();
  appendAuditEvent({
    actorId: challenge.customerId,
    actorRole: "customer",
    action: "otp.challenge_verified",
    entityType: "otp_challenge",
    entityId: challenge.id,
    message: `OTP challenge verified for ${challenge.purpose}.`,
  });

  return redactOtpChallenge(challenge);
}

export async function verifyOtpChallengeForCustomer(challengeId: string, code: string, customerId?: string) {
  if (getStorageMode() === "postgres") {
    return verifyPostgresOtpChallenge(challengeId, code, customerId);
  }

  return verifyOtpChallenge(challengeId, code, customerId);
}

export function assessTransferRisk(instruction: TransferInstruction): TransferRiskAssessment {
  const account = store.accounts.find((entry) => entry.id === instruction.sourceAccountId);
  const customer = account ? store.customers.find((entry) => entry.id === account.customerId) : undefined;
  const trustedDevice = instruction.customerDeviceId
    ? store.customerDevices.find(
        (device) => device.id === instruction.customerDeviceId && device.customerId === account?.customerId && device.trusted,
      )
    : undefined;
  const verifiedOtp = instruction.otpChallengeId
    ? store.otpChallenges.find(
        (challenge) =>
          challenge.id === instruction.otpChallengeId &&
          challenge.customerId === account?.customerId &&
          challenge.purpose === "transfer" &&
          challenge.targetId === instruction.sourceAccountId &&
          challenge.verified &&
          !challenge.consumedAt &&
          new Date(challenge.expiresAt).getTime() >= Date.now(),
      )
    : undefined;

  let score = 0;
  const reasons: string[] = [];

  if (!trustedDevice) {
    score += 35;
    reasons.push("untrusted_device");
  }

  if (!verifiedOtp) {
    score += 25;
    reasons.push("otp_not_verified");
  }

  if (customer && instruction.amountKobo > Number(kycTierDailyLimitsKobo[customer.kycTier]) * 0.5) {
    score += 25;
    reasons.push("large_against_kyc_tier");
  }

  const recentSimilarTransfer = store.transfers.some(
    (transfer) =>
      transfer.sourceAccountId === instruction.sourceAccountId &&
      transfer.beneficiaryAccountNumber === instruction.beneficiaryAccountNumber &&
      transfer.amountKobo === instruction.amountKobo &&
      Date.now() - new Date(transfer.createdAt).getTime() < 10 * 60 * 1000,
  );

  if (recentSimilarTransfer) {
    score += 20;
    reasons.push("recent_similar_transfer");
  }

  const level = score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low";

  return {
    score,
    level,
    reasons,
    requiresOtp: !verifiedOtp || score >= 25,
    requiresManualReview: score >= 50,
  };
}

export function consumeOtpChallenge(challengeId: string | undefined): void {
  if (!challengeId) {
    return;
  }

  const challenge = store.otpChallenges.find((entry) => entry.id === challengeId);

  if (challenge && challenge.verified && !challenge.consumedAt) {
    challenge.consumedAt = new Date().toISOString();
  }
}

function redactOtpChallenge<T extends { code: string; consumedAt?: string }>(challenge: T): Omit<T, "code" | "consumedAt"> {
  const { code: _code, consumedAt: _consumedAt, ...safeChallenge } = challenge;
  return safeChallenge;
}
