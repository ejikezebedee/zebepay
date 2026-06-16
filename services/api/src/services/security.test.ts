import assert from "node:assert/strict";
import test from "node:test";
import { store } from "../data/store.js";
import { createOtpChallenge, registerTrustedDevice, verifyOtpChallenge } from "./security.js";

test("registers trusted devices and verifies OTP challenges", () => {
  const device = registerTrustedDevice("cus_001", "Test device", "test-fingerprint-0001");
  const challenge = createOtpChallenge("cus_001", "transfer", "acct_001");
  const storedChallenge = store.otpChallenges.find((entry) => entry.id === challenge.id);
  const verified = verifyOtpChallenge(challenge.id, storedChallenge?.code ?? "");

  assert.equal(device.trusted, true);
  assert.equal(verified.verified, true);
  assert.equal(verified.targetId, "acct_001");
  assert.equal("code" in challenge, false);
});
