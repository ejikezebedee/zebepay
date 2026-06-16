import type { BankAccount, LedgerEntry } from "@zebepay/shared";
import { store } from "../data/store.js";

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getAccount(accountId: string): BankAccount | undefined {
  return store.accounts.find((account) => account.id === accountId);
}

export function getAccountLedger(accountId: string): LedgerEntry[] {
  return store.ledgerEntries
    .filter((entry) => entry.accountId === accountId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function postDebit(account: BankAccount, transactionId: string, amountKobo: number, narration: string): LedgerEntry {
  account.balanceKobo -= amountKobo;
  account.availableBalanceKobo -= amountKobo;

  const entry: LedgerEntry = {
    id: makeId("led"),
    transactionId,
    accountId: account.id,
    entryType: "debit",
    amountKobo,
    balanceAfterKobo: account.balanceKobo,
    narration,
    createdAt: new Date().toISOString(),
  };

  store.ledgerEntries.push(entry);
  return entry;
}

export function postCredit(account: BankAccount, transactionId: string, amountKobo: number, narration: string): LedgerEntry {
  account.balanceKobo += amountKobo;
  account.availableBalanceKobo += amountKobo;

  const entry: LedgerEntry = {
    id: makeId("led"),
    transactionId,
    accountId: account.id,
    entryType: "credit",
    amountKobo,
    balanceAfterKobo: account.balanceKobo,
    narration,
    createdAt: new Date().toISOString(),
  };

  store.ledgerEntries.push(entry);
  return entry;
}
