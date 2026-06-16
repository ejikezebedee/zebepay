# ADR-001: Ledger Locking, Idempotency, Audit, And Reconciliation

## Status

Accepted for initial build.

## Context

Zebepay is a commercial source-code platform for Nigerian banking and wallet products. The platform must avoid the common MVP mistake of storing balances as editable fields and treating provider callbacks as simple status updates.

Money movement requires:

- Accurate integer money handling
- Double-entry ledger posting
- Idempotency for retries
- Safe concurrency
- Immutable audit evidence
- Reconciliation between internal ledger and external providers

## Decision

### Money Storage

All NGN values are stored as integer kobo using `bigint`-compatible fields.

No financial amount may be stored as `float`, `double`, or JavaScript number-only arithmetic without validation boundaries.

### Ledger Posting

Financial transactions are posted through a journal-entry flow:

1. Create transaction intent.
2. Validate limits, account state, and idempotency key.
3. Open database transaction.
4. Lock affected ledger accounts.
5. Write balanced debit/credit journal entries.
6. Write transaction state event.
7. Commit.

Every journal entry must balance to zero.

### Idempotency

Every money-moving command and provider webhook must accept or derive an idempotency key.

Recommended uniqueness:

- `idempotency_key`
- `provider`
- `operation_type`
- `customer_id` when applicable

Duplicate keys must return the original result instead of posting money twice.

### Concurrency

The implementation should use explicit row locking or optimistic version checks around ledger accounts and transaction state transitions.

Invalid state transitions must be rejected.

### Audit Log

Audit logs are append-only. They must record:

- actor type
- actor ID
- action
- entity type
- entity ID
- previous state hash when available
- event hash
- timestamp
- request ID

The hash-chain design makes tampering visible in commercial and enterprise deployments.

### Reconciliation

Reconciliation compares:

- Internal transaction reference
- Provider reference
- Ledger journal ID
- Settlement amount
- Settlement date
- Provider status
- Internal status

Unmatched records become reconciliation exceptions for admin review.

## Consequences

This adds more engineering work than a simple MVP, but it is required for a serious banking/wallet platform.

The first implementation may use a sandbox provider, but the adapter contract must be realistic enough for Paystack, Monnify, Flutterwave, or a bank-sponsored provider.
