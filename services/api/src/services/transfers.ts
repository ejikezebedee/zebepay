import {
  findNigerianBank,
  isValidNubanLikeAccount,
  kycTierDailyLimitsKobo,
  type TransferInstruction,
  type TransferRecord,
} from "@zebepay/shared";
import { createHash } from "node:crypto";
import { store } from "../data/store.js";
import { appendAuditEvent } from "./audit.js";
import { getAccount, postCredit, postDebit } from "./ledger.js";
import { queueNotification } from "./notifications.js";
import { requirePermission } from "./rbac.js";
import { assessTransferRisk, consumeOtpChallenge } from "./security.js";
import { inMemoryUnitOfWork } from "../repositories/memoryRepositories.js";

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

export function createTransfer(instruction: TransferInstruction): TransferRecord {
  return inMemoryUnitOfWork.transaction("create_transfer", () => createTransferInsideTransaction(instruction));
}

function createTransferInsideTransaction(instruction: TransferInstruction): TransferRecord {
  const fingerprint = makeInstructionFingerprint(instruction);
  const existingIdempotency = store.idempotencyKeys.get(instruction.idempotencyKey);
  const existingTransfer = existingIdempotency
    ? store.transfers.find((transfer) => transfer.id === existingIdempotency.transferId)
    : undefined;

  if (existingTransfer) {
    if (existingIdempotency?.fingerprint !== fingerprint) {
      throw new Error("Idempotency key has already been used for a different transfer request.");
    }
    return existingTransfer;
  }

  const account = getAccount(instruction.sourceAccountId);
  const customer = account ? store.customers.find((entry) => entry.id === account.customerId) : undefined;
  const transfer: TransferRecord = {
    ...instruction,
    id: `trf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: "processing",
    reference: makeReference(),
    riskScore: 0,
    riskLevel: "low",
    riskReasons: [],
    createdAt: new Date().toISOString(),
  };

  if (!account || !customer) {
    transfer.status = "failed";
    transfer.failureReason = "Source account or customer was not found.";
  } else if (instruction.customerId && account.customerId !== instruction.customerId) {
    transfer.status = "failed";
    transfer.failureReason = "Source account does not belong to the authenticated customer.";
  } else if (account.status !== "active") {
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
  } else if (instruction.amountKobo > Number(kycTierDailyLimitsKobo[customer.kycTier])) {
    transfer.status = "requires_review";
    transfer.failureReason = "Transfer exceeds the customer's KYC tier daily limit.";
  } else if (account.availableBalanceKobo < instruction.amountKobo) {
    transfer.status = "failed";
    transfer.failureReason = "Insufficient available balance.";
  } else {
    const risk = assessTransferRisk(instruction);
    transfer.riskScore = risk.score;
    transfer.riskLevel = risk.level;
    transfer.riskReasons = risk.reasons;

    if (risk.reasons.includes("otp_not_verified") || risk.requiresManualReview) {
      transfer.status = "requires_review";
      transfer.failureReason = risk.reasons.includes("otp_not_verified")
        ? "Transfer requires a verified, unconsumed OTP challenge."
        : "Transfer is held for security review.";
      if (!risk.reasons.includes("otp_not_verified")) {
        consumeOtpChallenge(instruction.otpChallengeId);
      }
      appendAuditEvent({
        actorId: account.customerId,
        actorRole: "customer",
        action: "transfer.risk_hold",
        severity: risk.level === "critical" ? "critical" : "warning",
        entityType: "transfer",
        entityId: transfer.id,
        message: `Transfer ${transfer.reference} held for security review.`,
        metadata: { riskScore: risk.score, riskLevel: risk.level },
      });
      queueNotification({
        customerId: account.customerId,
        channel: "in_app",
        subject: "Transfer held for review",
        body: "Your transfer is under security review. You will be notified when it is released or rejected.",
        relatedEntityType: "transfer",
        relatedEntityId: transfer.id,
      });
      store.transfers.push(transfer);
      store.idempotencyKeys.set(instruction.idempotencyKey, { transferId: transfer.id, fingerprint });
      return transfer;
    }

    postDebit(account, transfer.id, instruction.amountKobo, instruction.narration || "Zebepay transfer");
    consumeOtpChallenge(instruction.otpChallengeId);
    transfer.status = "successful";
    transfer.completedAt = new Date().toISOString();
    appendAuditEvent({
      actorId: account.customerId,
      actorRole: "customer",
      action: "transfer.create",
      entityType: "transfer",
      entityId: transfer.id,
      message: `Transfer ${transfer.reference} posted successfully.`,
      metadata: { amountKobo: instruction.amountKobo, beneficiaryBankCode: instruction.beneficiaryBankCode },
    });
    queueNotification({
      customerId: account.customerId,
      channel: "in_app",
      subject: "Transfer successful",
      body: `Your transfer of ${instruction.amountKobo} kobo to ${instruction.beneficiaryName} was successful.`,
      relatedEntityType: "transfer",
      relatedEntityId: transfer.id,
    });
  }

  store.transfers.push(transfer);
  store.idempotencyKeys.set(instruction.idempotencyKey, { transferId: transfer.id, fingerprint });
  return transfer;
}

export function reverseTransfer(transferId: string, reason: string, actorId: string): TransferRecord {
  return inMemoryUnitOfWork.transaction("reverse_transfer", () => reverseTransferInsideTransaction(transferId, reason, actorId));
}

function reverseTransferInsideTransaction(transferId: string, reason: string, actorId: string): TransferRecord {
  const actor = requirePermission(actorId, "transfers:reverse");
  const transfer = store.transfers.find((entry) => entry.id === transferId);

  if (!transfer) {
    throw new Error("Transfer was not found.");
  }

  if (transfer.status !== "successful") {
    throw new Error("Only successful transfers can be reversed.");
  }

  const account = getAccount(transfer.sourceAccountId);

  if (!account) {
    throw new Error("Source account was not found.");
  }

  postCredit(account, `${transfer.id}_reversal`, transfer.amountKobo, `Reversal: ${reason}`);
  transfer.status = "reversed";
  transfer.reversedAt = new Date().toISOString();
  transfer.reversalReason = reason;

  appendAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    action: "transfer.reverse",
    severity: "warning",
    entityType: "transfer",
    entityId: transfer.id,
    message: `Transfer ${transfer.reference} reversed by ${actor.name}.`,
    metadata: { reason, amountKobo: transfer.amountKobo },
  });

  return transfer;
}

export function releaseHeldTransfer(transferId: string, actorId: string): TransferRecord {
  return inMemoryUnitOfWork.transaction("release_transfer", () => {
    const actor = requirePermission(actorId, "transfers:review");
    const transfer = store.transfers.find((entry) => entry.id === transferId);

    if (!transfer) {
      throw new Error("Transfer was not found.");
    }

    if (transfer.status !== "requires_review") {
      throw new Error("Only transfers requiring review can be released.");
    }

    const account = getAccount(transfer.sourceAccountId);

    if (!account || account.availableBalanceKobo < transfer.amountKobo) {
      throw new Error("Source account cannot fund the transfer.");
    }

    if (account.status !== "active") {
      throw new Error("Source account must be active before a held transfer can be released.");
    }

    postDebit(account, transfer.id, transfer.amountKobo, transfer.narration || "Zebepay transfer release");
    transfer.status = "successful";
    transfer.failureReason = undefined;
    transfer.completedAt = new Date().toISOString();
    transfer.reviewedBy = actor.id;
    transfer.reviewedAt = transfer.completedAt;

    appendAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      action: "transfer.release",
      entityType: "transfer",
      entityId: transfer.id,
      message: `Held transfer ${transfer.reference} released by ${actor.name}.`,
      metadata: { riskScore: transfer.riskScore, riskLevel: transfer.riskLevel },
    });
    queueNotification({
      customerId: account.customerId,
      channel: "in_app",
      subject: "Transfer released",
      body: "Your held transfer has been released successfully.",
      relatedEntityType: "transfer",
      relatedEntityId: transfer.id,
    });

    return transfer;
  });
}

export function rejectHeldTransfer(transferId: string, reason: string, actorId: string): TransferRecord {
  return inMemoryUnitOfWork.transaction("reject_transfer", () => {
    const actor = requirePermission(actorId, "transfers:review");
    const transfer = store.transfers.find((entry) => entry.id === transferId);

    if (!transfer) {
      throw new Error("Transfer was not found.");
    }

    if (transfer.status !== "requires_review") {
      throw new Error("Only transfers requiring review can be rejected.");
    }

    transfer.status = "failed";
    transfer.failureReason = reason;
    transfer.reviewedBy = actor.id;
    transfer.reviewedAt = new Date().toISOString();

    appendAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      action: "transfer.reject",
      severity: "warning",
      entityType: "transfer",
      entityId: transfer.id,
      message: `Held transfer ${transfer.reference} rejected by ${actor.name}.`,
      metadata: { reason, riskScore: transfer.riskScore, riskLevel: transfer.riskLevel },
    });
    queueNotification({
      customerId: store.accounts.find((account) => account.id === transfer.sourceAccountId)?.customerId,
      channel: "in_app",
      subject: "Transfer rejected",
      body: "Your held transfer was rejected after security review.",
      relatedEntityType: "transfer",
      relatedEntityId: transfer.id,
    });

    return transfer;
  });
}
