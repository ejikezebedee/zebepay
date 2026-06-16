# Phase 17 - PostgreSQL Transfer Transaction Cutover

Status: completed controlled cutover path, pending live database validation.

## Implemented

- PostgreSQL transfer transaction service.
- Explicit enablement flag: `ZEBEPAY_POSTGRES_TRANSFER_WRITES=enabled`.
- Transfer creation in PostgreSQL mode now has a durable transaction path for:
  - idempotency lookup and persistence
  - source account row lock
  - customer/account ownership validation
  - trusted-device and verified-OTP risk checks
  - recent-similar-transfer risk check
  - cumulative same-day KYC tier exposure check before debit
  - transfer record insert
  - account debit
  - ledger debit entry
  - OTP consumption
  - audit event insert
  - notification queue insert
- PostgreSQL mode still fails closed when the transfer-write flag is not enabled.
- Production readiness now includes the transfer-write flag as a blocker.

## Safety behavior

Sandbox memory mode remains unchanged.

PostgreSQL mode requires two conditions for transfer creation:

- `ZEBEPAY_STORAGE_MODE=postgres`
- `ZEBEPAY_POSTGRES_TRANSFER_WRITES=enabled`

Without the second flag, `POST /v1/transfers` returns `TRANSFER_CUTOVER_REQUIRED`.

## Boundary

The transaction path is implemented and covered with mock SQL tests. It has not been executed against a live buyer PostgreSQL database in this local run. Buyers should run migrations, seed equivalent test records, then execute the opt-in PostgreSQL smoke and transfer-flow validation before enabling production flags.

## Verification target

This phase is verified by TypeScript compile, API route tests, SQL transaction service tests, root build/lint/test, and commercial cleanup scan.

Verification passed:

```text
npm run build
npm run lint
npm test
```

Results:

- API tests: 33 passed, 1 opt-in live PostgreSQL smoke skipped by default.
- Shared tests: 2 passed.
- SQL transaction service tests cover successful debit flow and risk-review hold without debit.
- SQL transaction service tests cover cumulative same-day KYC tier exposure hold without debit.
- PostgreSQL-mode route guard remains covered when transfer writes are not explicitly enabled.
