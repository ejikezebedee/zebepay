import type {
  AccountControlRecord,
  AdminUser,
  AuditEvent,
  BankAccount,
  Beneficiary,
  CustomerProfile,
  CustomerUser,
  CustomerDevice,
  FundingIntentRecord,
  KycReviewCase,
  LedgerEntry,
  NotificationMessage,
  OtpChallenge,
  PayoutDispatchRecord,
  TransferRecord,
} from "@zebepay/shared";
import { sandboxPasswordHash } from "../services/sandboxCrypto.js";

export interface ZebepayStore {
  customers: CustomerProfile[];
  customerUsers: CustomerUser[];
  accounts: BankAccount[];
  beneficiaries: Beneficiary[];
  ledgerEntries: LedgerEntry[];
  transfers: TransferRecord[];
  adminUsers: AdminUser[];
  auditEvents: AuditEvent[];
  kycReviewCases: KycReviewCase[];
  accountControls: AccountControlRecord[];
  customerDevices: CustomerDevice[];
  otpChallenges: OtpChallenge[];
  notifications: NotificationMessage[];
  fundingIntents: FundingIntentRecord[];
  payoutDispatches: PayoutDispatchRecord[];
  idempotencyKeys: Map<string, { transferId: string; fingerprint: string }>;
}

const now = new Date().toISOString();

export const store: ZebepayStore = {
  customers: [
    {
      id: "cus_001",
      firstName: "Adaeze",
      lastName: "Okafor",
      phone: "+2348012345678",
      email: "adaeze@example.com",
      kycTier: "tier_2",
      kycStatus: "approved",
      bvnLast4: "4821",
      ninLast4: "1742",
      createdAt: now,
    },
  ],
  accounts: [
    {
      id: "acct_001",
      customerId: "cus_001",
      accountNumber: "1023456789",
      accountName: "Adaeze Okafor",
      currency: "NGN",
      balanceKobo: 2_450_000_00,
      availableBalanceKobo: 2_450_000_00,
      status: "active",
      createdAt: now,
    },
  ],
  customerUsers: [
    {
      id: "cu_001",
      customerId: "cus_001",
      email: "adaeze@example.com",
      passwordHash: sandboxPasswordHash("ZebepayDemo!2026"),
      phone: "+2348012345678",
      active: true,
      createdAt: now,
    },
  ],
  beneficiaries: [
    {
      id: "ben_001",
      customerId: "cus_001",
      name: "Chinedu Okeke",
      accountNumber: "0123456789",
      bankCode: "000027",
      bankName: "Standard Chartered Bank Nigeria",
      status: "active",
      createdAt: now,
    },
  ],
  ledgerEntries: [
    {
      id: "led_001",
      transactionId: "seed_opening_balance",
      accountId: "acct_001",
      entryType: "credit",
      amountKobo: 2_450_000_00,
      balanceAfterKobo: 2_450_000_00,
      narration: "Opening balance",
      createdAt: now,
    },
  ],
  transfers: [],
  adminUsers: [
    {
      id: "adm_001",
      name: "Operations Manager",
      email: "ops@zebepay.example",
      passwordHash: sandboxPasswordHash("ZebepayAdmin!2026"),
      role: "operations_manager",
      active: true,
      createdAt: now,
    },
    {
      id: "adm_002",
      name: "Compliance Officer",
      email: "compliance@zebepay.example",
      passwordHash: sandboxPasswordHash("ZebepayCompliance!2026"),
      role: "compliance_officer",
      active: true,
      createdAt: now,
    },
  ],
  auditEvents: [
    {
      id: "aud_001",
      actorId: "system",
      actorRole: "system",
      action: "transfer.create",
      severity: "info",
      entityType: "account",
      entityId: "acct_001",
      message: "Seed account and opening ledger entry created.",
      createdAt: now,
    },
  ],
  kycReviewCases: [
    {
      id: "kyc_001",
      customerId: "cus_001",
      status: "approved",
      submittedTier: "tier_2",
      assignedTo: "adm_002",
      decision: "approved",
      decisionReason: "Seed customer approved for sandbox banking workflow.",
      createdAt: now,
      decidedAt: now,
    },
  ],
  accountControls: [],
  customerDevices: [
    {
      id: "dev_001",
      customerId: "cus_001",
      label: "Adaeze primary phone",
      fingerprint: "sandbox-device-fingerprint",
      trusted: true,
      lastSeenAt: now,
      createdAt: now,
    },
  ],
  otpChallenges: [],
  notifications: [],
  fundingIntents: [],
  payoutDispatches: [],
  idempotencyKeys: new Map(),
};
