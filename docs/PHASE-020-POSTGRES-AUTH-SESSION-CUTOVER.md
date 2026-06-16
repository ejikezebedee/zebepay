# Phase 20 - PostgreSQL Auth Session Cutover

Status: completed controlled cutover path, pending live database validation.

## Implemented

- Customer login now reads customer users and customer profiles through the active banking repository provider.
- In PostgreSQL mode, customer login uses PostgreSQL-backed customer records instead of memory-only records.
- Admin login now reads active admin users from PostgreSQL when `ZEBEPAY_STORAGE_MODE=postgres`.
- Auth login audit events now write to PostgreSQL `audit_events` in PostgreSQL mode.
- PostgreSQL-mode session validation no longer requires matching memory-store customer/admin records after token signature and expiry checks pass.
- Admin route permission checks now use signed admin role claims for route-level gates.
- PostgreSQL admin write services still perform durable database permission checks inside each transaction.

## Safety behavior

Memory mode remains unchanged:

- customer/admin login still uses seeded memory records
- session validation still checks memory-store user/admin liveness
- memory admin operations still use memory RBAC checks

PostgreSQL mode still uses sandbox signed sessions. This phase removes memory-store coupling from the PostgreSQL path; it does not replace sandbox session issuance with an external production identity provider.

## Verification target

This phase is verified by shared build, API TypeScript compile, API service tests, root build/test/lint, and commercial cleanup scan.

Verification passed:

```text
npm run build -w @zebepay/shared
npm run lint -w @zebepay/api
npm run test -w @zebepay/api
npm run build
npm test
npm run lint
```

Results:

- API tests: 36 passed, 1 opt-in live PostgreSQL smoke skipped by default.
- Shared tests: 2 passed.
- Session tests cover PostgreSQL-mode session validation without memory-backed principals.
- Session tests cover PostgreSQL-mode admin permission gates from signed role claims.

## Boundary

Live PostgreSQL auth validation requires `DATABASE_URL` and the bundled migration/seed against a disposable database. A later production-auth phase should replace sandbox signed sessions with the buyer's chosen identity/session provider.
