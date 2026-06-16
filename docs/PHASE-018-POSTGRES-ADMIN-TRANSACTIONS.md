# Phase 18 - PostgreSQL Admin Transaction Cutover

Status: completed controlled cutover path, pending live database validation.

## Implemented

- PostgreSQL admin operations service.
- Explicit enablement flag: `ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled`.
- Admin writes in PostgreSQL mode now fail closed until the flag is enabled.
- Admin transfer review queue reads from PostgreSQL when `ZEBEPAY_STORAGE_MODE=postgres`.
- PostgreSQL transaction paths now cover:
  - account freeze and unfreeze
  - account control record insert
  - KYC decision and review-case update with distinct approved/rejected/needs-more-info audit actions
  - held transfer release with account row lock, debit, ledger entry, audit event, and notification
  - held transfer rejection with audit event and notification
  - successful transfer reversal with account row lock, credit, ledger entry, and audit event
- Production readiness now includes the admin-write flag as a blocker.

## Safety behavior

Sandbox memory mode remains unchanged.

PostgreSQL admin writes require two conditions:

- `ZEBEPAY_STORAGE_MODE=postgres`
- `ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled`

Without the second flag, admin write routes return `ADMIN_WRITE_CUTOVER_REQUIRED`.

## Boundary

The transaction path is implemented and covered with mock SQL tests. It has not been executed against a live buyer PostgreSQL database in this local run. Buyers should run migrations, seed equivalent admin/customer/account/transfer records, then execute PostgreSQL admin-operation smoke validation before enabling production flags.

## Verification target

This phase is verified by TypeScript compile, API service tests, root build/test, and commercial cleanup scan.

Verification passed:

```text
npm run build
npm run lint
npm test
```

Results:

- API tests: 34 passed, 1 opt-in live PostgreSQL smoke skipped by default.
- Shared tests: 2 passed.
- PostgreSQL admin-operation tests cover freeze, KYC decision, KYC needs-more-info audit taxonomy, transfer release, transfer reject, and transfer reversal SQL effects.
