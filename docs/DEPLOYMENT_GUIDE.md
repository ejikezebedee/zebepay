# Zebepay Deployment Guide

Zebepay is designed to be deployed by buyers into their own approved infrastructure. This guide is intentionally provider-neutral.

## Deployment Boundary

The package does not include a banking license, payment-rail authorization, KYC/AML certification, or production security approval. Buyers must complete those steps independently.

## Recommended Environments

- `local`: developer evaluation and feature work.
- `staging`: provider sandbox, QA, security review, and user acceptance testing.
- `production`: regulated live environment controlled by the buyer.

## Infrastructure

Recommended production components:

- Web hosting for customer and admin Next.js apps.
- Node.js API runtime.
- PostgreSQL database.
- Redis for sessions, queues, rate limits, and idempotency acceleration.
- Object storage for exports and compliance documents.
- Secrets manager.
- Centralized logs and metrics.
- Error tracking and uptime monitoring.

## Environment Variables

Start with `.env.example`, then replace every placeholder with buyer-controlled production values.

Required classes of configuration:

- App URLs.
- API URL.
- Database URL.
- Redis URL.
- JWT secrets.
- `ZEBEPAY_SANDBOX_SESSION_SECRET` while the sandbox bearer-session boundary is still in use.
- Encryption key.
- Provider credentials.
- Webhook signing secrets.
- CORS origin list.

Never commit `.env` files or production secrets.

## Database Migration

Apply migrations in order:

```text
db/migrations/001_core_banking_schema.sql
```

Production migration rules:

- Back up the database before migration.
- Run migrations in staging first.
- Verify rollback strategy before production.
- Keep ledger and audit tables append-only.
- Do not edit historical ledger rows manually.

## PostgreSQL Production Gate

Production startup is intentionally blocked until the buyer confirms the durable PostgreSQL path.

Required production settings:

```text
ZEBEPAY_STORAGE_MODE=postgres
DATABASE_URL=postgres://db_user@db_host:5432/zebepay
ZEBEPAY_POSTGRES_TRANSFER_WRITES=enabled
ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled
ZEBEPAY_POSTGRES_AUTH_SESSION=enabled
ZEBEPAY_POSTGRES_AUDIT_WRITES=enabled
ZEBEPAY_PERSISTENCE_CRITICAL_WRITES=enabled
ZEBEPAY_MIGRATIONS_CONFIRMED=true
```

Before setting these flags in production, validate customer login, admin login, signed session validation, transfer creation, admin account controls, KYC decisions, transfer release/reject, reversal, audit-event persistence, and the `/ready` response against the target database.

Rollback rule: if any readiness check fails, remove production traffic, set the affected write flag back to `disabled`, restore from the last verified database backup if data integrity is affected, and re-run staging validation before another production attempt.

## Security Gates

Before production release:

- Confirm TLS is enforced.
- Confirm CORS is restricted.
- Confirm auth tokens are signed by a production identity boundary.
- Confirm password and PIN hashing is implemented.
- Confirm OTP delivery is integrated.
- Confirm rate limiting is active.
- Confirm webhook signatures are verified.
- Confirm logs do not expose BVN, NIN, full account credentials, OTP codes, tokens, or secrets.
- Complete penetration testing and code review.

## Operational Runbook

Minimum live operations should include:

- Daily reconciliation review.
- Failed transfer investigation.
- Manual review queue ownership.
- KYC review SLA.
- Incident response owner.
- Backup restore test schedule.
- Security alert escalation path.
- Customer support handoff process.

## Buyer Sign-Off

Production deployment should not proceed until the buyer's leadership, compliance officer, security reviewer, and provider partners approve the launch.
