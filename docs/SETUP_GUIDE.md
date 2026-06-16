# Zebepay Setup Guide

This guide helps buyers run Zebepay locally for evaluation, customization, and provider-integration planning.

## Requirements

- Node.js 20 or newer.
- npm 10 or newer.
- PostgreSQL 15 or newer for database-backed development.
- Redis is recommended for production queues, rate limits, and background jobs.

The sandbox API defaults to in-memory repositories so buyers can inspect the system before provisioning infrastructure. PostgreSQL mode is available behind explicit readiness flags for buyer-controlled validation.

## Local Setup

```bash
npm install --include=dev
cp .env.example .env
npm run build
npm test
```

## Run The Apps

```bash
npm run dev
```

Default local URLs:

- Customer web: `http://localhost:3000`
- Admin web: `http://localhost:3001`
- API: `http://localhost:4000`

If a port is already in use, set the service-specific port in the matching app or service configuration before running.

## Database Setup

1. Create a PostgreSQL database.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` to the buyer's database connection string.
4. Apply migrations from `db/migrations/` in numeric order.
5. Set `ZEBEPAY_STORAGE_MODE=postgres` after the database is reachable.
6. Run the PostgreSQL smoke harness against a disposable or staging database before enabling production flags.
7. Set `ZEBEPAY_POSTGRES_TRANSFER_WRITES=enabled` only after validating transfer creation against the buyer database.
8. Set `ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled` only after validating account freeze/unfreeze, KYC decisions, transfer review release/reject, and transfer reversal against the buyer database.
9. Set `ZEBEPAY_POSTGRES_AUTH_SESSION=enabled` only after customer login, admin login, and signed session validation read PostgreSQL-backed principals.
10. Set `ZEBEPAY_POSTGRES_AUDIT_WRITES=enabled` only after login, transfer, admin, and security audit events write to PostgreSQL.
11. Set `ZEBEPAY_PERSISTENCE_CRITICAL_WRITES=enabled` only after accounts, ledger entries, transfers, audit events, KYC cases, account controls, notifications, provider handoff records, idempotency keys, reconciliation exceptions, webhook deliveries, and incident records write durably.
12. Set `ZEBEPAY_MIGRATIONS_CONFIRMED=true` only after applying and verifying the bundled migrations.

The first migration is:

```text
db/migrations/001_core_banking_schema.sql
```

## Sandbox Credentials

The sandbox seed data includes:

- Customer: `adaeze@example.com`
- Admin operations manager: `ops@zebepay.example`
- Admin compliance officer: `compliance@zebepay.example`
- Customer password: `ZebepayDemo!2026`
- Admin operations password: `ZebepayAdmin!2026`
- Admin compliance password: `ZebepayCompliance!2026`

Sandbox passwords are hashed in the seed store and sandbox sessions are signed bearer tokens. Production buyers must still connect a hardened identity provider, MFA, password/PIN policy, and secret rotation before live use.

When `NODE_ENV=production`, set `ZEBEPAY_SANDBOX_SESSION_SECRET` before starting the API. The default sandbox signing secret is blocked outside local sandbox mode.

When `NODE_ENV=production`, the API also enforces the durable-storage gate. Startup is blocked unless `ZEBEPAY_STORAGE_MODE=postgres`, `DATABASE_URL` is configured, PostgreSQL transfer writes are enabled, PostgreSQL admin writes are enabled, PostgreSQL auth/session validation is confirmed, PostgreSQL audit writes are confirmed, critical persistence writes are confirmed, and migrations are confirmed.

## First Verification

Run:

```bash
npm run build
npm test
```

Then smoke-check:

- `GET /health`
- `POST /v1/auth/customer/login`
- `GET /v1/customers`
- `POST /v1/security/otp-challenges`
- `POST /v1/transfers`
- `GET /v1/admin/transfers/review-queue`
- `GET /v1/admin/storage/status`
- `GET /v1/admin/production-readiness`

For PostgreSQL validation, run:

```bash
npm run smoke:postgres -- --seed
npm run smoke:postgres
```

Use `--seed` only against a disposable or approved staging database because it applies the validation seed data.

## Production Replacement Points

Before live use, buyers must replace or complete:

- Password and PIN hashing.
- JWT signing and refresh-token rotation.
- Buyer-specific PostgreSQL backup, restore, retention, and migration operations.
- Durable persistence confirmation for any buyer-added operational records.
- Redis-backed rate limits and queues.
- OTP provider.
- PostgreSQL-mode sandbox OTP delivery with an approved OTP/SMS/push provider.
- Notification provider.
- KYC provider.
- Funding and payout providers.
- Webhook signature verification.
- Monitoring and alerting.
- Legal, compliance, security, and regulatory review.
