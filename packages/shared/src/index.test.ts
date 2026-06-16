import assert from "node:assert/strict";
import test from "node:test";
import { formatKobo, isValidNigerianPhone, isValidNubanLikeAccount } from "./index.js";

test("formats kobo as NGN without floating point math", () => {
  assert.equal(formatKobo(123456789), "NGN 1,234,567.89");
  assert.equal(formatKobo(-5000), "-NGN 50.00");
});

test("validates Nigerian phone and NUBAN-like account inputs", () => {
  assert.equal(isValidNigerianPhone("+2348012345678"), true);
  assert.equal(isValidNigerianPhone("08012345678"), true);
  assert.equal(isValidNigerianPhone("+2344012345678"), false);
  assert.equal(isValidNubanLikeAccount("0123456789"), true);
  assert.equal(isValidNubanLikeAccount("12345"), false);
});
