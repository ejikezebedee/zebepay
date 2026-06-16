# Phase 16 - Async Repository Cutover

Status: completed partial cutover, not full production persistence.

## Implemented

- Repository provider that selects memory repositories in sandbox mode and PostgreSQL repositories when `ZEBEPAY_STORAGE_MODE=postgres`.
- Async route cutover for:
  - customer summary reads
  - beneficiary listing
  - beneficiary creation
  - beneficiary disabling
  - account statement generation
  - transfer listing
- Transfer creation now fails closed in PostgreSQL mode until ledger, risk, notification, and audit writes are all moved into one SQL transaction.

## Production safety behavior

In memory mode, sandbox transfer creation remains available for buyer evaluation.

In PostgreSQL mode, `POST /v1/transfers` returns `TRANSFER_CUTOVER_REQUIRED` instead of writing a money-moving record to memory. This prevents buyers from accidentally enabling durable storage mode while the most sensitive write path is still partially memory-backed.

## Boundary

This phase does not claim full production persistence. It moves repository-backed read/list and beneficiary flows onto the async repository provider and blocks unsafe transfer writes in PostgreSQL mode unless the dedicated PostgreSQL transfer-write path is enabled.

## Verification target

This phase is verified by TypeScript compile, route tests, root build/lint/test, and commercial cleanup scan.

Verification passed:

```text
npm run build
npm run lint
npm test
```

Results:

- API tests: 24 passed, 1 opt-in live PostgreSQL smoke skipped by default.
- Shared tests: 2 passed.
- PostgreSQL-mode transfer creation guard covered by route regression test.
