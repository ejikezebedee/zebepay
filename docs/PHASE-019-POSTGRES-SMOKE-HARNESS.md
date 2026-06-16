# Phase 19: Live PostgreSQL Validation & Smoke Harness

Phase 19 provides a repeatable PostgreSQL validation path for buyers before enabling production write flags.

## Added

- `db/seeds/phase15_postgres_validation_seed.sql`
  - Seeds the sandbox customer, account, customer user, admin users, trusted device, KYC review, beneficiary, opening ledger entry, and audit event into PostgreSQL.
- `npm run smoke:postgres -- --seed`
  - Applies the core migration and validation seed to a disposable PostgreSQL database.
  - Starts the API in PostgreSQL mode with transfer/admin write flags, critical-write confirmation, and migration confirmation enabled.
  - Exercises customer login, admin login, customer summary reads, beneficiary create/disable, PostgreSQL-backed OTP creation/verification, PostgreSQL transfer creation, review queue, release, reject, reversal, and readiness.
  - Verifies PostgreSQL evidence for transfer statuses, OTP consumption, ledger entries, audit events, and notifications.
  - Prints structured JSON evidence when the smoke passes.
- PostgreSQL beneficiary creation now generates a durable ID when the API sends an empty placeholder ID.

## Required Environment

```bash
export DATABASE_URL="postgres://zebepay_user@localhost:5432/zebepay_validation"
export ZEBEPAY_SANDBOX_SESSION_SECRET="test-zebepay-sandbox-session-secret"
```

Use a disposable validation database. The smoke runner creates money-movement records, ledger entries, audit events, notifications, and idempotency records.

## Run

```bash
npm install
npm run smoke:postgres -- --seed
```

Successful output is a JSON object with `status: "passed"`, `phase: "19"`, `productionReady: true`, and database evidence counts for transfers, ledger entries, audit events, notifications, and OTP consumption.

To run against an already started API:

```bash
export ZEBEPAY_SMOKE_BASE_URL="http://127.0.0.1:4000"
export DATABASE_URL="postgres://zebepay_user@localhost:5432/zebepay_validation"
npm run smoke:postgres
```

The already started API must be running with:

```bash
export ZEBEPAY_STORAGE_MODE=postgres
export ZEBEPAY_POSTGRES_TRANSFER_WRITES=enabled
export ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled
export ZEBEPAY_POSTGRES_AUTH_SESSION=enabled
export ZEBEPAY_POSTGRES_AUDIT_WRITES=enabled
export ZEBEPAY_PERSISTENCE_CRITICAL_WRITES=enabled
export ZEBEPAY_MIGRATIONS_CONFIRMED=true
```

## Production Gate

Do not enable production traffic until this smoke passes against the target database and the production readiness endpoint has no unresolved blockers.

Required production flags remain:

```bash
ZEBEPAY_STORAGE_MODE=postgres
ZEBEPAY_POSTGRES_TRANSFER_WRITES=enabled
ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled
ZEBEPAY_POSTGRES_AUTH_SESSION=enabled
ZEBEPAY_POSTGRES_AUDIT_WRITES=enabled
ZEBEPAY_PERSISTENCE_CRITICAL_WRITES=enabled
ZEBEPAY_MIGRATIONS_CONFIRMED=true
```

## Verification Evidence

The harness fails if any of these are missing:

- API health readiness.
- Customer and admin login.
- Customer summary read.
- Beneficiary create and disable.
- PostgreSQL-backed OTP delivery, verification, and consumption.
- Successful transfer debit.
- Held transfer release debit.
- Held transfer rejection.
- Successful transfer reversal credit.
- Transfer audit events for create, release, reject, and reverse.
- Transfer notifications.
- Production readiness with no blockers.

## Known Boundary

Customer and admin login still use sandbox signed session primitives. Phase 20 removes memory-store coupling from PostgreSQL-mode login/session validation, but a later production-auth phase should replace sandbox session issuance with the buyer's chosen identity/session provider.
