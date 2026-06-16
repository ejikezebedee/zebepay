# Zebepay Database

This folder contains buyer-portable database artifacts for the commercial source-code package.

## Migration Order

1. `migrations/001_core_banking_schema.sql`

## Production Notes

- Use PostgreSQL or a compatible managed database.
- Encrypt or tokenize sensitive identity fields in production.
- Keep ledger writes inside database transactions.
- Keep audit-event writes append-only.
- Do not run this system with placeholder secrets.
- Buyers are responsible for licensing, compliance, hosting, bank-provider contracts, and operational controls.

## Adapter Boundary

The API includes a PostgreSQL pool and transaction helper in `services/api/src/repositories/postgresAdapter.ts`. It also includes async PostgreSQL repository implementations in `services/api/src/repositories/postgresRepositories.ts` for customers, customer users, accounts, beneficiaries, ledger statements, and transfers.

The current sandbox routes still use in-memory repositories so buyers can inspect and test the product without provisioning infrastructure. Move service calls to the async PostgreSQL repositories route-by-route after the buyer database, backups, restore process, and operational controls are ready.

## PostgreSQL Test Harness

Always-on tests validate SQL mapping with a mock query client. A live database smoke test is opt-in:

```bash
DATABASE_URL=postgresql://zebepay_user@localhost:5432/zebepay npm run test:postgres -w @zebepay/api
```

The live smoke only runs when `ZEBEPAY_RUN_POSTGRES_TESTS=true`, which the script sets for that command.
