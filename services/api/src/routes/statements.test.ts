import assert from "node:assert/strict";
import test from "node:test";
import { ledgerRepository } from "../repositories/memoryRepositories.js";

test("builds an account statement with balances and entries", () => {
  const statement = ledgerRepository.buildStatement("acct_001", new Date("1970-01-01T00:00:00.000Z"), new Date());

  assert.equal(statement.accountId, "acct_001");
  assert.ok(statement.entries.length >= 1);
  assert.equal(statement.currency, "NGN");
});
