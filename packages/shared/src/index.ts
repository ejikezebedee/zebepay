export const PRODUCT_NAME = "Zebepay";
export const DEFAULT_CURRENCY = "NGN";
export const MONEY_MINOR_UNIT = "kobo";

export type KycTier = "tier_0" | "tier_1" | "tier_2" | "tier_3";
export type KycStatus = "not_started" | "pending_review" | "approved" | "rejected";
export type AccountStatus = "active" | "frozen" | "closed";
export type LedgerEntryType = "debit" | "credit";
export type TransferChannel = "internal" | "nip_mock" | "manual_review";
export type BeneficiaryStatus = "active" | "disabled";
export type AdminRole = "super_admin" | "operations_manager" | "compliance_officer" | "support_agent" | "auditor";
export type AuditSeverity = "info" | "warning" | "critical";
export type NotificationChannel = "email" | "sms" | "push" | "in_app";
export type NotificationStatus = "queued" | "sent" | "failed";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type OtpPurpose = "login" | "transfer" | "beneficiary";
export type StorageMode = "memory" | "postgres";
export type PersistenceState = "durable" | "memory_only" | "not_configured";
export type SecurityEventType =
  | "device.trusted"
  | "otp.challenge_created"
  | "otp.challenge_verified"
  | "transfer.risk_hold"
  | "transfer.release"
  | "transfer.reject";
export type AuditEventAction =
  | "auth.login"
  | "auth.logout"
  | "account.freeze"
  | "account.unfreeze"
  | "kyc.approve"
  | "kyc.reject"
  | "kyc.needs_more_info"
  | "beneficiary.create"
  | "beneficiary.disable"
  | "funding.intent_create"
  | "payout.dispatch_create"
  | "transfer.create"
  | "transfer.reverse"
  | SecurityEventType
  | "notification.queue";
export type KycReviewDecision = "approved" | "rejected" | "needs_more_info";

export type TransactionStatus =
  | "draft"
  | "pending"
  | "processing"
  | "requires_review"
  | "successful"
  | "failed"
  | "reversed"
  | "cancelled";

export const transactionStatuses: TransactionStatus[] = [
  "draft",
  "pending",
  "processing",
  "requires_review",
  "successful",
  "failed",
  "reversed",
  "cancelled",
];

export function formatKobo(amountKobo: bigint | number): string {
  const amount = typeof amountKobo === "bigint" ? amountKobo : BigInt(amountKobo);
  const sign = amount < 0n ? "-" : "";
  const absolute = amount < 0n ? -amount : amount;
  const naira = absolute / 100n;
  const kobo = absolute % 100n;
  return `${sign}NGN ${naira.toLocaleString("en-NG")}.${kobo.toString().padStart(2, "0")}`;
}

export const kycTierDailyLimitsKobo: Record<KycTier, bigint> = {
  tier_0: 0n,
  tier_1: 500_000n,
  tier_2: 5_000_000n,
  tier_3: 50_000_000n,
};

export const nigerianBanks = [
  { code: "000013", name: "Guaranty Trust Bank" },
  { code: "000014", name: "Access Bank" },
  { code: "000015", name: "Zenith Bank" },
  { code: "000016", name: "First Bank of Nigeria" },
  { code: "000021", name: "United Bank for Africa" },
  { code: "000023", name: "Citibank Nigeria" },
  { code: "000026", name: "Stanbic IBTC Bank" },
  { code: "000027", name: "Standard Chartered Bank Nigeria" },
  { code: "000030", name: "Heritage Bank" },
  { code: "000033", name: "United Mortgage Bank" },
  { code: "000034", name: "Union Bank of Nigeria" },
  { code: "000035", name: "Wema Bank" },
  { code: "000036", name: "Polaris Bank" },
  { code: "000050", name: "Ecobank Nigeria" },
  { code: "000100", name: "Suntrust Bank" },
] as const;

export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  kycTier: KycTier;
  kycStatus: KycStatus;
  bvnLast4?: string;
  ninLast4?: string;
  createdAt: string;
}

export interface CustomerUser {
  id: string;
  customerId: string;
  email: string;
  passwordHash: string;
  phone: string;
  active: boolean;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  customerId: string;
  accountNumber: string;
  accountName: string;
  currency: typeof DEFAULT_CURRENCY;
  balanceKobo: number;
  availableBalanceKobo: number;
  status: AccountStatus;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  entryType: LedgerEntryType;
  amountKobo: number;
  balanceAfterKobo: number;
  narration: string;
  createdAt: string;
}

export interface TransferInstruction {
  customerId?: string;
  sourceAccountId: string;
  amountKobo: number;
  beneficiaryName: string;
  beneficiaryAccountNumber: string;
  beneficiaryBankCode: string;
  narration: string;
  channel: TransferChannel;
  idempotencyKey: string;
  customerDeviceId?: string;
  otpChallengeId?: string;
}

export interface TransferRecord extends TransferInstruction {
  id: string;
  status: TransactionStatus;
  reference: string;
  riskScore: number;
  riskLevel: RiskLevel;
  riskReasons: string[];
  failureReason?: string;
  createdAt: string;
  completedAt?: string;
  reversedAt?: string;
  reversalReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Beneficiary {
  id: string;
  customerId: string;
  name: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  status: BeneficiaryStatus;
  createdAt: string;
}

export interface AccountStatement {
  accountId: string;
  accountNumber: string;
  accountName: string;
  currency: typeof DEFAULT_CURRENCY;
  openingBalanceKobo: number;
  closingBalanceKobo: number;
  totalDebitsKobo: number;
  totalCreditsKobo: number;
  from: string;
  to: string;
  entries: LedgerEntry[];
  generatedAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  actorRole: AdminRole | "system" | "customer";
  action: AuditEventAction;
  severity: AuditSeverity;
  entityType: string;
  entityId: string;
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface KycReviewCase {
  id: string;
  customerId: string;
  status: KycStatus;
  submittedTier: KycTier;
  assignedTo?: string;
  decision?: KycReviewDecision;
  decisionReason?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface AccountControlRecord {
  id: string;
  accountId: string;
  action: "freeze" | "unfreeze";
  reason: string;
  actorId: string;
  createdAt: string;
}

export interface CustomerDevice {
  id: string;
  customerId: string;
  label: string;
  fingerprint: string;
  trusted: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export interface OtpChallenge {
  id: string;
  customerId: string;
  purpose: OtpPurpose;
  targetId?: string;
  code: string;
  verified: boolean;
  expiresAt: string;
  createdAt: string;
  verifiedAt?: string;
  consumedAt?: string;
}

export interface NotificationMessage {
  id: string;
  customerId?: string;
  adminUserId?: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  subject: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: string;
  sentAt?: string;
}

export interface FundingIntentRecord {
  id: string;
  provider: "sandbox_bank_transfer" | "sandbox_nip";
  customerId: string;
  amountKobo: number;
  reference: string;
  status: "pending_provider_confirmation";
  virtualAccountNumber: string;
  expiresAt: string;
  createdAt: string;
}

export interface PayoutDispatchRecord {
  id: string;
  provider: "sandbox_bank_transfer" | "sandbox_nip";
  sourceAccountId: string;
  customerId: string;
  amountKobo: number;
  beneficiaryAccountNumber: string;
  beneficiaryBankCode: string;
  status: "pending_provider_dispatch";
  reference: string;
  createdAt: string;
}

export interface StorageRecordGroup {
  name: string;
  persistence: PersistenceState;
  requiredForProduction: boolean;
  recordCount?: number;
}

export interface StorageStatus {
  mode: StorageMode;
  nodeEnv: string;
  databaseUrlConfigured: boolean;
  criticalWritesEnabled: boolean;
  postgresTransferWritesEnabled: boolean;
  postgresAdminWritesEnabled: boolean;
  postgresAuthSessionEnabled: boolean;
  postgresAuditWritesEnabled: boolean;
  migrationConfirmation: boolean;
  generatedAt: string;
  groups: StorageRecordGroup[];
}

export interface ProductionReadinessCheck {
  key: string;
  status: "pass" | "blocker";
  message: string;
}

export interface ProductionReadinessReport {
  ready: boolean;
  generatedAt: string;
  storage: StorageStatus;
  checks: ProductionReadinessCheck[];
  blockers: string[];
}

export interface TransferRiskAssessment {
  score: number;
  level: RiskLevel;
  reasons: string[];
  requiresOtp: boolean;
  requiresManualReview: boolean;
}

export const rolePermissions: Record<AdminRole, string[]> = {
  super_admin: ["*"],
  operations_manager: [
    "accounts:write",
    "transfers:reverse",
    "transfers:review",
    "transfers:read",
    "audit:read",
    "kyc:read",
    "customers:read",
  ],
  compliance_officer: ["kyc:write", "kyc:read", "audit:read", "accounts:freeze"],
  support_agent: ["customers:read", "accounts:read", "kyc:read"],
  auditor: ["audit:read", "customers:read", "accounts:read", "transfers:read"],
};

export function isValidNigerianPhone(phone: string): boolean {
  return /^(\+234|0)[789][01]\d{8}$/.test(phone);
}

export function isValidNubanLikeAccount(accountNumber: string): boolean {
  return /^\d{10}$/.test(accountNumber);
}

export function findNigerianBank(code: string) {
  return nigerianBanks.find((bank) => bank.code === code);
}
