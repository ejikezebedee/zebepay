import assert from "node:assert/strict";
import test from "node:test";
import { store } from "../data/store.js";
import { createOtpChallenge, verifyOtpChallenge } from "./security.js";
import { createTransfer, releaseHeldTransfer, reverseTransfer } from "./transfers.js";

function createVerifiedTransferOtp(): string {
  const challenge = createOtpChallenge("cus_001", "transfer", "acct_001");
  const storedChallenge = store.otpChallenges.find((entry) => entry.id === challenge.id);
  verifyOtpChallenge(challenge.id, storedChallenge?.code ?? "", "cus_001");
  return challenge.id;
}

test("creates a transfer once for the same idempotency key", () => {
  const beforeCount = store.transfers.length;
  const instruction = {
    sourceAccountId: "acct_001",
    amountKobo: 100_000,
    beneficiaryName: "Test Beneficiary",
    beneficiaryAccountNumber: "0123456789",
    beneficiaryBankCode: "000027",
    narration: "Automated test transfer",
    channel: "nip_mock" as const,
    idempotencyKey: "automated-test-key-0001",
    customerDeviceId: "dev_001",
    otpChallengeId: createVerifiedTransferOtp(),
  };

  const first = createTransfer(instruction);
  const second = createTransfer(instruction);

  assert.equal(first.id, second.id);
  assert.equal(first.status, "successful");
  assert.equal(store.transfers.length, beforeCount + 1);
});

test("reverses a successful transfer with a credit ledger entry", () => {
  const transfer = createTransfer({
    sourceAccountId: "acct_001",
    amountKobo: 200_000,
    beneficiaryName: "Reversal Beneficiary",
    beneficiaryAccountNumber: "0123456789",
    beneficiaryBankCode: "000027",
    narration: "Automated reversal transfer",
    channel: "nip_mock",
    idempotencyKey: "automated-test-key-0002",
    customerDeviceId: "dev_001",
    otpChallengeId: createVerifiedTransferOtp(),
  });

  const reversed = reverseTransfer(transfer.id, "Automated reversal test", "adm_001");
  const reversalLedger = store.ledgerEntries.find((entry) => entry.transactionId === `${transfer.id}_reversal`);

  assert.equal(reversed.status, "reversed");
  assert.equal(reversalLedger?.entryType, "credit");
  assert.equal(reversalLedger?.amountKobo, transfer.amountKobo);
});

test("holds risky transfers for manual security review", () => {
  const transfer = createTransfer({
    sourceAccountId: "acct_001",
    amountKobo: 300_000,
    beneficiaryName: "Risk Review Beneficiary",
    beneficiaryAccountNumber: "0123456789",
    beneficiaryBankCode: "000027",
    narration: "Risk review transfer",
    channel: "nip_mock",
    idempotencyKey: "automated-test-key-risk-0003",
  });

  assert.equal(transfer.status, "requires_review");
  assert.equal(transfer.riskLevel, "high");
  assert.deepEqual(transfer.riskReasons, ["untrusted_device", "otp_not_verified"]);
});

test("rejects idempotency key reuse for different transfer requests", () => {
  const instruction = {
    sourceAccountId: "acct_001",
    amountKobo: 110_000,
    beneficiaryName: "First Idempotency Beneficiary",
    beneficiaryAccountNumber: "0123456789",
    beneficiaryBankCode: "000027",
    narration: "Idempotency fingerprint test",
    channel: "nip_mock" as const,
    idempotencyKey: "automated-test-key-idempotency-0004",
    customerDeviceId: "dev_001",
    otpChallengeId: createVerifiedTransferOtp(),
  };

  createTransfer(instruction);

  assert.throws(
    () => createTransfer({ ...instruction, amountKobo: 120_000 }),
    /Idempotency key has already been used/,
  );
});

test("consumes verified OTP challenges after an accepted transfer attempt", () => {
  const otpChallengeId = createVerifiedTransferOtp();
  const firstTransfer = createTransfer({
    sourceAccountId: "acct_001",
    amountKobo: 90_000,
    beneficiaryName: "OTP Consumption Beneficiary",
    beneficiaryAccountNumber: "0123456789",
    beneficiaryBankCode: "000027",
    narration: "OTP consumption test",
    channel: "nip_mock",
    idempotencyKey: "automated-test-key-otp-consume-0006",
    customerDeviceId: "dev_001",
    otpChallengeId,
  });
  const consumedChallenge = store.otpChallenges.find((challenge) => challenge.id === otpChallengeId);

  assert.equal(firstTransfer.status, "successful");
  assert.ok(consumedChallenge?.consumedAt);

  const secondTransfer = createTransfer({
    sourceAccountId: "acct_001",
    amountKobo: 91_000,
    beneficiaryName: "OTP Reuse Beneficiary",
    beneficiaryAccountNumber: "0123456789",
    beneficiaryBankCode: "000027",
    narration: "OTP reuse test",
    channel: "nip_mock",
    idempotencyKey: "automated-test-key-otp-reuse-0007",
    customerDeviceId: "dev_001",
    otpChallengeId,
  });

  assert.equal(secondTransfer.status, "requires_review");
  assert.equal(secondTransfer.failureReason, "Transfer requires a verified, unconsumed OTP challenge.");
  assert.ok(secondTransfer.riskReasons.includes("otp_not_verified"));
});

test("does not release held transfers while the source account is frozen", () => {
  const account = store.accounts.find((entry) => entry.id === "acct_001");
  assert.ok(account);

  const originalStatus = account.status;
  account.status = "frozen";

  try {
    const transfer = createTransfer({
      sourceAccountId: "acct_001",
      amountKobo: 50_000,
      beneficiaryName: "Frozen Account Beneficiary",
      beneficiaryAccountNumber: "0123456789",
      beneficiaryBankCode: "000027",
      narration: "Frozen account release test",
      channel: "nip_mock",
      idempotencyKey: "automated-test-key-frozen-0005",
      customerDeviceId: "dev_001",
      otpChallengeId: createVerifiedTransferOtp(),
    });

    assert.equal(transfer.status, "requires_review");
    assert.throws(() => releaseHeldTransfer(transfer.id, "adm_001"), /Source account must be active/);
  } finally {
    account.status = originalStatus;
  }
});
