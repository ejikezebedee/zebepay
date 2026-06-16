# Phase 21 - PostgreSQL Production Readiness Gate

Status: completed controlled readiness gate, pending live buyer database validation.

## Implemented

- Production readiness now requires explicit PostgreSQL auth/session confirmation.
- Production readiness now requires explicit PostgreSQL audit-write confirmation.
- `GET /ready` and `GET /v1/admin/production-readiness` report the new blockers.
- `NODE_ENV=production` startup fails closed until every PostgreSQL readiness confirmation is present.
- The PostgreSQL smoke harness starts the API with the full readiness flag set.
- Buyer setup and API documentation now list the complete PostgreSQL production gate.

## Required Production Confirmations

```bash
ZEBEPAY_STORAGE_MODE=postgres
DATABASE_URL=postgres://db_user@db_host:5432/zebepay
ZEBEPAY_POSTGRES_TRANSFER_WRITES=enabled
ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled
ZEBEPAY_POSTGRES_AUTH_SESSION=enabled
ZEBEPAY_POSTGRES_AUDIT_WRITES=enabled
ZEBEPAY_PERSISTENCE_CRITICAL_WRITES=enabled
ZEBEPAY_MIGRATIONS_CONFIRMED=true
```

## Operator Checklist

Only enable the full gate after confirming:

- bundled migrations were applied to the target database
- customer login reads PostgreSQL-backed customer users and profiles
- admin login reads PostgreSQL-backed active admin users
- signed customer/admin session validation no longer depends on memory-store principals in PostgreSQL mode
- transfer creation writes account debit, ledger, transfer, idempotency, OTP consumption, audit, and notification records durably
- admin account controls, KYC decisions, transfer release/reject, and reversal write durably
- login, transfer, admin, and security audit events are present in PostgreSQL `audit_events`
- `npm run smoke:postgres` passes against the target database
- `GET /ready` returns `productionReady: true`

## Safety Behavior

This gate prevents accidental production claims. Missing flags are blockers, not warnings. The system remains buyer-review software and still requires licensing, provider integration, security review, compliance approval, backup/restore drills, observability, and go-live authorization before regulated live use.

## Verification Target

This phase is verified by shared build, API lint, API tests, root build/test/lint, PostgreSQL smoke script type-check coverage through the root build path, and commercial cleanup scan.
