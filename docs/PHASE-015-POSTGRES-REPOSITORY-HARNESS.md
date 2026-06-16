# Phase 15 - PostgreSQL Repository Implementation And Harness

Status: completed foundation pass, not production cutover.

## Implemented

- Async repository contracts for PostgreSQL-backed reads and writes.
- PostgreSQL repository implementation for:
  - customers
  - customer users
  - accounts
  - beneficiaries
  - ledger entry listing
  - statement generation
  - transfer find/save with upsert
- PostgreSQL transaction harness remains in `postgresAdapter.ts`.
- Mock-backed repository tests validate SQL mapping and transfer upsert behavior without requiring a live database.
- Opt-in live PostgreSQL smoke command:

```text
npm run test:postgres -w @zebepay/api
```

## Boundary

Sandbox routes still use memory repositories by default. This keeps local buyer evaluation simple and avoids pretending production cutover is complete. The next implementation step is to migrate service calls to async repositories route-by-route under database-backed mode, then prove ledger and transfer writes inside real SQL transactions.

## Buyer instruction

Before enabling production persistence flags, buyers should:

- apply the bundled migration
- run the opt-in PostgreSQL smoke test against their own database
- complete repository cutover for critical write paths
- verify backup and restore
- perform security and compliance review

## Verification target

This phase is verified by TypeScript compile, always-on repository tests, root build/lint/test, and commercial cleanup scan.

Verification passed:

```text
npm run build
npm run lint
npm test
```

Results:

- API tests: 23 passed, 1 opt-in live PostgreSQL smoke skipped by default.
- Shared tests: 2 passed.
- `git diff --check`: passed.
- Cleanup scan: no internal workspace paths, machine-specific home paths, private tokens, private keys, Telegram IDs, or private references added.
