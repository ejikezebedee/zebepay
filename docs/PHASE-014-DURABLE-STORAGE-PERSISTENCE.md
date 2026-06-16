# Phase 14 - Durable Storage And Production Persistence

Status: completed foundation pass, not production complete.

## Implemented

- Storage-mode reporting for sandbox memory mode and PostgreSQL mode.
- Admin-protected storage status endpoint.
- Admin-protected production-readiness endpoint.
- Production startup blocker for unsafe memory-only operational records.
- Critical persistence confirmation flags for repository wiring and migration verification.
- Sandbox retention of funding intent and payout dispatch records.
- PostgreSQL migration coverage for:
  - funding intents
  - payout dispatches
  - idempotency keys
  - provider webhook deliveries
  - reconciliation exceptions
  - incident records

## API additions

- `GET /v1/admin/storage/status`
- `GET /v1/admin/production-readiness`
- `GET /ready`

## Production gate

When `NODE_ENV=production`, the API blocks startup unless all of these are true:

- `ZEBEPAY_STORAGE_MODE=postgres`
- `DATABASE_URL` is configured
- `ZEBEPAY_PERSISTENCE_CRITICAL_WRITES=enabled`
- `ZEBEPAY_MIGRATIONS_CONFIRMED=true`

`ZEBEPAY_PERSISTENCE_CRITICAL_WRITES=enabled` is an operator confirmation flag. Buyers should only set it after critical repositories write operational records to PostgreSQL.

## Boundary

This phase does not claim live regulated production readiness. It adds durable-storage visibility, schema coverage, and a hard production safety gate. Buyers remain responsible for completing PostgreSQL repository implementations, backups, restore drills, retention policy, security review, provider integrations, licensing, and go-live approval.

## Release audit

- Paths: portable buyer-facing docs and environment examples only; no machine-specific workspace paths added.
- Install flow: `.env.example` documents storage mode, persistence confirmation, and migration confirmation flags.
- Documentation: API reference, setup guide, release notes, package manifest, and this phase report updated.
- Logging and operations: `/ready`, admin storage status, and admin production-readiness routes expose blockers without external provider calls.
- Security warnings: production startup blocks memory-only persistence and requires explicit operator confirmation before durable mode is treated as ready.
- Context size: no large generated files or pasted build artifacts added.
- Buyer usability: sandbox remains memory-mode friendly; production expectations are explicit and fail closed.
- Commercial polish: implementation remains source-code software only and avoids regulated-production claims.

Verification passed:

```text
npm run build
npm run lint
npm test
```
