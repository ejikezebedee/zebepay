import { store } from "../data/store.js";
import type { FundingIntentRecord, PayoutDispatchRecord } from "@zebepay/shared";

export type SandboxProvider = "sandbox_bank_transfer" | "sandbox_nip";

export interface ReconciliationSummary {
  generatedAt: string;
  successfulTransferCount: number;
  reviewTransferCount: number;
  failedTransferCount: number;
  ledgerDebitKobo: number;
  ledgerCreditKobo: number;
  notificationOutboxCount: number;
  providerSettlementStatus: "sandbox_reconciliation_ready";
}

function makeReference(prefix: string): string {
  return `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function createFundingIntent(input: {
  customerId: string;
  amountKobo: number;
  provider: SandboxProvider;
}): FundingIntentRecord {
  const intent: FundingIntentRecord = {
    id: `fund_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    provider: input.provider,
    customerId: input.customerId,
    amountKobo: input.amountKobo,
    reference: makeReference("OBNGFUND"),
    status: "pending_provider_confirmation",
    virtualAccountNumber: "9991023456",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  store.fundingIntents.push(intent);
  return intent;
}

export function createPayoutDispatch(input: {
  sourceAccountId: string;
  customerId: string;
  amountKobo: number;
  beneficiaryAccountNumber: string;
  beneficiaryBankCode: string;
  provider: SandboxProvider;
}): PayoutDispatchRecord {
  const dispatch: PayoutDispatchRecord = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    provider: input.provider,
    sourceAccountId: input.sourceAccountId,
    customerId: input.customerId,
    amountKobo: input.amountKobo,
    beneficiaryAccountNumber: input.beneficiaryAccountNumber,
    beneficiaryBankCode: input.beneficiaryBankCode,
    status: "pending_provider_dispatch",
    reference: makeReference("OBNGPAY"),
    createdAt: new Date().toISOString(),
  };

  store.payoutDispatches.push(dispatch);
  return dispatch;
}

export function buildReconciliationSummary(): ReconciliationSummary {
  return {
    generatedAt: new Date().toISOString(),
    successfulTransferCount: store.transfers.filter((transfer) => transfer.status === "successful").length,
    reviewTransferCount: store.transfers.filter((transfer) => transfer.status === "requires_review").length,
    failedTransferCount: store.transfers.filter((transfer) => transfer.status === "failed").length,
    ledgerDebitKobo: store.ledgerEntries
      .filter((entry) => entry.entryType === "debit")
      .reduce((sum, entry) => sum + entry.amountKobo, 0),
    ledgerCreditKobo: store.ledgerEntries
      .filter((entry) => entry.entryType === "credit")
      .reduce((sum, entry) => sum + entry.amountKobo, 0),
    notificationOutboxCount: store.notifications.length,
    providerSettlementStatus: "sandbox_reconciliation_ready",
  };
}
