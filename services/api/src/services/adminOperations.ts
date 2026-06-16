import type { AccountControlRecord, KycReviewDecision, KycTier } from "@zebepay/shared";
import { store } from "../data/store.js";
import { appendAuditEvent } from "./audit.js";
import { requirePermission } from "./rbac.js";

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function kycAuditAction(decision: KycReviewDecision) {
  return decision === "approved" ? "kyc.approve" : decision === "rejected" ? "kyc.reject" : "kyc.needs_more_info";
}

export function setAccountStatus(accountId: string, action: "freeze" | "unfreeze", reason: string, actorId: string) {
  const actor = requirePermission(actorId, "accounts:freeze");
  const account = store.accounts.find((entry) => entry.id === accountId);

  if (!account) {
    throw new Error("Account was not found.");
  }

  account.status = action === "freeze" ? "frozen" : "active";

  const control: AccountControlRecord = {
    id: makeId("ctrl"),
    accountId,
    action,
    reason,
    actorId,
    createdAt: new Date().toISOString(),
  };

  store.accountControls.push(control);
  appendAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    action: action === "freeze" ? "account.freeze" : "account.unfreeze",
    severity: action === "freeze" ? "warning" : "info",
    entityType: "account",
    entityId: accountId,
    message: `Account ${action} applied by ${actor.name}.`,
    metadata: { reason },
  });

  return { account, control };
}

export function decideKycReview(
  customerId: string,
  decision: KycReviewDecision,
  approvedTier: KycTier,
  reason: string,
  actorId: string,
) {
  const actor = requirePermission(actorId, "kyc:write");
  const customer = store.customers.find((entry) => entry.id === customerId);

  if (!customer) {
    throw new Error("Customer was not found.");
  }

  const now = new Date().toISOString();
  customer.kycStatus = decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "pending_review";
  customer.kycTier = decision === "approved" ? approvedTier : customer.kycTier;

  const review = store.kycReviewCases.find((entry) => entry.customerId === customerId) ?? {
    id: makeId("kyc"),
    customerId,
    status: customer.kycStatus,
    submittedTier: approvedTier,
    createdAt: now,
  };

  review.status = customer.kycStatus;
  review.submittedTier = approvedTier;
  review.assignedTo = actor.id;
  review.decision = decision;
  review.decisionReason = reason;
  review.decidedAt = now;

  if (!store.kycReviewCases.some((entry) => entry.id === review.id)) {
    store.kycReviewCases.push(review);
  }

  appendAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    action: kycAuditAction(decision),
    severity: decision === "approved" ? "info" : "warning",
    entityType: "customer",
    entityId: customerId,
    message: `KYC review ${decision} by ${actor.name}.`,
    metadata: { reason, approvedTier },
  });

  return { customer, review };
}
