import {
  findNigerianBank,
  isValidNubanLikeAccount,
  kycTierDailyLimitsKobo,
  type KycTier,
  type RiskLevel,
  type TransferInstruction,
  type TransferRecord,
} from "@zebepay/shared";
import { createHash } from "node:crypto";
import type pg from "pg";
import { createPostgresPool, withPostgresTransaction } from "../repositories/postgresAdapter.js";
import { mapTransfer, type PostgresQueryable } from "../repositories/postgresRepositories.js";

type Row = Record<string, unknown>;

let transferPool: pg.Pool | undefined;

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeReference(): string {
  return `OBNG${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function makeInstructionFingerprint(instruction: TransferInstruction): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        customerId: instruction.customerId,
        sourceAccountId: instruction.sourceAccountId,
        amountKobo: instruction.amountKobo,
        beneficiaryName: instruction.beneficiaryName,
        beneficiaryAccountNumber: instruction.beneficiaryAccountNumber,
        beneficiaryBankCode: instruction.beneficiaryBankCode,
        narration: instruction.narration,
        channel: instruction.channel,
      }),
    )
    .digest("hex");
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function riskLevel(score: number): RiskLevel {
  return score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low";
}

async function sumTodayPostedTransfersKobo(db: PostgresQueryable, customerId: string, sourceAccountId: string): Promise<number> {
  const result = await db.query(
    `SELECT COALESCE(SUM(amount_kobo), 0) AS total_kobo
     FROM transfers
     WHERE customer_id = $1
       AND source_account_id = $2
       AND status IN ('successful', 'reversed')
       AND completed_at >= date_trunc('day', now())`,
    [customerId, sourceAccountId],
  );

  return toNumber(result.rows[0]?.total_kobo ?? 0);
}

async function insertAuditEvent(
  db: PostgresQueryable,
  input: {
    actorId: string;
    actorRole: string;
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
      input.actorId,
      input.actorRole,
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
    customerId: string;
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
    [makeId("ntf"), input.customerId, input.subject, input.body, input.relatedEntityType, input.relatedEntityId, new Date().toISOString()],
  );
}

async function saveTransfer(db: PostgresQueryable, transfer: TransferRecord): Promise<TransferRecord> {
  const result = await db.query(
    `INSERT INTO transfers (
       id, customer_id, source_account_id, amount_kobo, beneficiary_name, beneficiary_account_number,
       beneficiary_bank_code, narration, channel, idempotency_key, customer_device_id, otp_challenge_id,
       status, reference, risk_score, risk_level, risk_reasons, failure_reason, created_at, completed_at,
       reversed_at, reversal_reason, reviewed_by, reviewed_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, $11, $12,
       $13, $14, $15, $16, $17::jsonb, $18, $19, $20,
       $21, $22, $23, $24
     )
     RETURNING *`,
    [
      transfer.id,
      transfer.customerId ?? null,
      transfer.sourceAccountId,
      transfer.amountKobo,
      transfer.beneficiaryName,
      transfer.beneficiaryAccountNumber,
      transfer.beneficiaryBankCode,
      transfer.narration,
      transfer.channel,
      transfer.idempotencyKey,
      transfer.customerDeviceId ?? null,
      transfer.otpChallengeId ?? null,
      transfer.status,
      transfer.reference,
      transfer.riskScore,
      transfer.riskLevel,
      JSON.stringify(transfer.riskReasons),
      transfer.failureReason ?? null,
      transfer.createdAt,
      transfer.completedAt ?? null,
      transfer.reversedAt ?? null,
      transfer.reversalReason ?? null,
      transfer.reviewedBy ?? null,
      transfer.reviewedAt ?? null,
    ],
  );

  return mapTransfer(result.rows[0]);
}

async function saveIdempotency(db: PostgresQueryable, key: string, transferId: string, fingerprint: string): Promise<void> {
  await db.query(
    `INSERT INTO idempotency_keys (idempotency_key, transfer_id, fingerprint, created_at)
     VALUES ($1, $2, $3, $4)`,
    [key, transferId, fingerprint, new Date().toISOString()],
  );
}

async function assessPostgresTransferRisk(
  db: PostgresQueryable,
  instruction: TransferInstruction,
  account: Row,
): Promise<{ score: number; level: RiskLevel; reasons: string[]; requiresManualReview: boolean; verifiedOtp: boolean }> {
  let score = 0;
  const reasons: string[] = [];
  const trustedDevice = instruction.customerDeviceId
    ? await db.query("SELECT id FROM customer_devices WHERE id = $1 AND customer_id = $2 AND trusted = true LIMIT 1", [
        instruction.customerDeviceId,
        account.customer_id,
      ])
    : { rows: [] };
  const otp = instruction.otpChallengeId
    ? await db.query(
        `SELECT id FROM otp_challenges
         WHERE id = $1 AND customer_id = $2 AND purpose = 'transfer' AND target_id = $3
           AND verified = true AND consumed_at IS NULL AND expires_at >= now()
         LIMIT 1`,
        [instruction.otpChallengeId, account.customer_id, instruction.sourceAccountId],
      )
    : { rows: [] };

  if (!trustedDevice.rows[0]) {
    score += 35;
    reasons.push("untrusted_device");
  }

  if (!otp.rows[0]) {
    score += 25;
    reasons.push("otp_not_verified");
  }

  if (instruction.amountKobo > Number(kycTierDailyLimitsKobo[account.kyc_tier as KycTier]) * 0.5) {
    score += 25;
    reasons.push("large_against_kyc_tier");
  }

  const recentSimilar = await db.query(
    `SELECT id FROM transfers
     WHERE source_account_id = $1 AND beneficiary_account_number = $2 AND amount_kobo = $3
       AND created_at >= now() - interval '10 minutes'
     LIMIT 1`,
    [instruction.sourceAccountId, instruction.beneficiaryAccountNumber, instruction.amountKobo],
  );

  if (recentSimilar.rows[0]) {
    score += 20;
    reasons.push("recent_similar_transfer");
  }

  return {
    score,
    level: riskLevel(score),
    reasons,
    requiresManualReview: score >= 50,
    verifiedOtp: Boolean(otp.rows[0]),
  };
}

export async function createPostgresTransferInsideTransaction(
  db: PostgresQueryable,
  instruction: TransferInstruction,
): Promise<TransferRecord> {
  const fingerprint = makeInstructionFingerprint(instruction);
  const existingIdempotency = await db.query(
    `SELECT i.fingerprint, t.*
     FROM idempotency_keys i
     JOIN transfers t ON t.id = i.transfer_id
     WHERE i.idempotency_key = $1
     LIMIT 1`,
    [instruction.idempotencyKey],
  );

  if (existingIdempotency.rows[0]) {
    if (String(existingIdempotency.rows[0].fingerprint) !== fingerprint) {
      throw new Error("Idempotency key has already been used for a different transfer request.");
    }

    return mapTransfer(existingIdempotency.rows[0]);
  }

  const accountResult = await db.query(
    `SELECT a.*, c.kyc_tier
     FROM accounts a
     JOIN customers c ON c.id = a.customer_id
     WHERE a.id = $1
     FOR UPDATE`,
    [instruction.sourceAccountId],
  );
  const account = accountResult.rows[0];

  if (!account) {
    throw new Error("Source account or customer was not found.");
  }

  const transfer: TransferRecord = {
    ...instruction,
    id: makeId("trf"),
    customerId: instruction.customerId,
    status: "processing",
    reference: makeReference(),
    riskScore: 0,
    riskLevel: "low",
    riskReasons: [],
    createdAt: new Date().toISOString(),
  };

  if (instruction.customerId && String(account.customer_id) !== instruction.customerId) {
    transfer.status = "failed";
    transfer.failureReason = "Source account does not belong to the authenticated customer.";
  } else if (String(account.status) !== "active") {
    transfer.status = "requires_review";
    transfer.failureReason = "Source account is not active.";
  } else if (!isValidNubanLikeAccount(instruction.beneficiaryAccountNumber)) {
    transfer.status = "failed";
    transfer.failureReason = "Beneficiary account number must be 10 digits.";
  } else if (!findNigerianBank(instruction.beneficiaryBankCode)) {
    transfer.status = "failed";
    transfer.failureReason = "Beneficiary bank code is not supported.";
  } else if (instruction.amountKobo <= 0) {
    transfer.status = "failed";
    transfer.failureReason = "Amount must be greater than zero.";
  } else if (instruction.amountKobo > Number(kycTierDailyLimitsKobo[account.kyc_tier as KycTier])) {
    transfer.status = "requires_review";
    transfer.failureReason = "Transfer exceeds the customer's KYC tier daily limit.";
  } else if (toNumber(account.available_balance_kobo) < instruction.amountKobo) {
    transfer.status = "failed";
    transfer.failureReason = "Insufficient available balance.";
  } else {
    const postedTodayKobo = await sumTodayPostedTransfersKobo(db, String(account.customer_id), instruction.sourceAccountId);
    const dailyLimitKobo = Number(kycTierDailyLimitsKobo[account.kyc_tier as KycTier]);

    if (postedTodayKobo + instruction.amountKobo > dailyLimitKobo) {
      transfer.status = "requires_review";
      transfer.failureReason = "Transfer would exceed the customer's remaining KYC tier daily limit.";
      transfer.riskScore = 50;
      transfer.riskLevel = "high";
      transfer.riskReasons = ["daily_kyc_limit_exceeded"];
    } else {
      const risk = await assessPostgresTransferRisk(db, instruction, account);
      transfer.riskScore = risk.score;
      transfer.riskLevel = risk.level;
      transfer.riskReasons = risk.reasons;

      if (!risk.verifiedOtp || risk.requiresManualReview) {
        transfer.status = "requires_review";
        transfer.failureReason = !risk.verifiedOtp
          ? "Transfer requires a verified, unconsumed OTP challenge."
          : "Transfer is held for security review.";
        if (risk.verifiedOtp) {
          await db.query("UPDATE otp_challenges SET consumed_at = $1 WHERE id = $2", [new Date().toISOString(), instruction.otpChallengeId]);
        }
      } else {
        const balanceAfterKobo = toNumber(account.balance_kobo) - instruction.amountKobo;
        const availableAfterKobo = toNumber(account.available_balance_kobo) - instruction.amountKobo;

        await db.query("UPDATE accounts SET balance_kobo = $1, available_balance_kobo = $2 WHERE id = $3", [
          balanceAfterKobo,
          availableAfterKobo,
          instruction.sourceAccountId,
        ]);
        await db.query(
          `INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount_kobo, balance_after_kobo, narration, created_at)
           VALUES ($1, $2, $3, 'debit', $4, $5, $6, $7)`,
          [
            makeId("led"),
            transfer.id,
            instruction.sourceAccountId,
            instruction.amountKobo,
            balanceAfterKobo,
            instruction.narration,
            new Date().toISOString(),
          ],
        );
        await db.query("UPDATE otp_challenges SET consumed_at = $1 WHERE id = $2", [new Date().toISOString(), instruction.otpChallengeId]);
        transfer.status = "successful";
        transfer.completedAt = new Date().toISOString();
      }
    }
  }

  const savedTransfer = await saveTransfer(db, transfer);
  await saveIdempotency(db, instruction.idempotencyKey, savedTransfer.id, fingerprint);

  if (savedTransfer.status === "successful") {
    await insertAuditEvent(db, {
      actorId: String(account.customer_id),
      actorRole: "customer",
      action: "transfer.create",
      entityType: "transfer",
      entityId: savedTransfer.id,
      message: `Transfer ${savedTransfer.reference} posted successfully.`,
      metadata: { amountKobo: instruction.amountKobo, beneficiaryBankCode: instruction.beneficiaryBankCode },
    });
    await insertNotification(db, {
      customerId: String(account.customer_id),
      subject: "Transfer successful",
      body: `Your transfer of ${instruction.amountKobo} kobo to ${instruction.beneficiaryName} was successful.`,
      relatedEntityType: "transfer",
      relatedEntityId: savedTransfer.id,
    });
  } else if (savedTransfer.status === "requires_review") {
    await insertAuditEvent(db, {
      actorId: String(account.customer_id),
      actorRole: "customer",
      action: "transfer.risk_hold",
      severity: savedTransfer.riskLevel === "critical" ? "critical" : "warning",
      entityType: "transfer",
      entityId: savedTransfer.id,
      message: `Transfer ${savedTransfer.reference} held for security review.`,
      metadata: { riskScore: savedTransfer.riskScore, riskLevel: savedTransfer.riskLevel },
    });
    await insertNotification(db, {
      customerId: String(account.customer_id),
      subject: "Transfer held for review",
      body: "Your transfer is under security review. You will be notified when it is released or rejected.",
      relatedEntityType: "transfer",
      relatedEntityId: savedTransfer.id,
    });
  }

  return savedTransfer;
}

export async function createPostgresTransfer(instruction: TransferInstruction): Promise<TransferRecord> {
  if (!transferPool) {
    transferPool = createPostgresPool();
  }

  return withPostgresTransaction(transferPool, (client) => createPostgresTransferInsideTransaction(client, instruction));
}
