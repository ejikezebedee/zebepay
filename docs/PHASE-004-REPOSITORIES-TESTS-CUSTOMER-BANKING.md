# Phase 004 - Repositories, Tests, and Customer Banking

Status: completed foundation pass, not production complete.

## Delivered in this phase

- Repository contracts for customers, accounts, beneficiaries, ledger, transfers, and unit-of-work transactions.
- In-memory repository implementations for sandbox execution and automated tests.
- PostgreSQL adapter boundary with pool creation and transaction wrapper for buyer production wiring.
- Transaction wrapper around transfer creation and reversal so ledger/account/audit mutations roll back together in the sandbox.
- Customer authentication route with replaceable JWT-provider boundary.
- Beneficiary management routes for listing, creating, and disabling saved Nigerian bank beneficiaries.
- Account statement route with opening balance, closing balance, total debits, total credits, and ledger entries.
- Customer portal expanded with beneficiary and statement sections.
- Automated tests for money formatting, Nigerian input validation, idempotent transfers, transfer reversal, and statement generation.

## API routes added

- `POST /v1/auth/customer/login`
- `GET /v1/customers/:customerId/beneficiaries`
- `POST /v1/beneficiaries`
- `DELETE /v1/customers/:customerId/beneficiaries/:beneficiaryId`
- `GET /v1/accounts/:accountId/statement`

## Verification performed

- `npm run build`
- `npm test`
- `GET /health`
- `POST /v1/auth/customer/login`
- `GET /v1/customers/cus_001/beneficiaries`
- `POST /v1/beneficiaries`
- `GET /v1/accounts/acct_001/statement`
- Commercial cleanup scan for internal path leaks

## Release risks logged

- `npm audit --omit=dev` still reports a moderate PostCSS advisory through the current Next.js dependency chain. npm suggests a breaking forced remediation path, so this remains recorded for deliberate release hardening.

## Production boundary

The PostgreSQL adapter is ready as a boundary, but the API still uses the in-memory repository in the sandbox. Phase 005 should wire repository implementations to PostgreSQL, enforce SQL transactions for all ledger writes, and add integration tests against a disposable database.

## Next phase

Phase 005 should deliver PostgreSQL-backed repositories, migration runner documentation, customer registration/onboarding, beneficiary verification workflow, statement export to PDF/CSV, and expanded API test coverage.
