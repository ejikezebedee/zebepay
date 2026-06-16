# Zebepay Troubleshooting

## Install Fails

Run:

```bash
npm install --include=dev
```

If install still fails:

- Confirm Node.js 20 or newer is installed.
- Delete `node_modules` and `package-lock.json` only if the buyer intentionally wants a fresh dependency resolution.
- Re-run `npm install --include=dev`.

## Build Fails

Run:

```bash
npm run build
```

Common causes:

- Missing dependencies.
- Wrong Node.js version.
- TypeScript errors introduced during customization.
- Environment variables missing in a deployment platform.

## API Does Not Start

Check:

- `PORT` is available.
- `.env` exists when required by the deployment.
- `DATABASE_URL` is valid if the buyer has enabled PostgreSQL mode.
- No production secret still uses a placeholder value.

## Production Readiness Is Blocked

Check `GET /ready` or `GET /v1/admin/production-readiness`.

Production readiness requires:

- `ZEBEPAY_STORAGE_MODE=postgres`
- `DATABASE_URL`
- `ZEBEPAY_POSTGRES_TRANSFER_WRITES=enabled`
- `ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled`
- `ZEBEPAY_POSTGRES_AUTH_SESSION=enabled`
- `ZEBEPAY_POSTGRES_AUDIT_WRITES=enabled`
- `ZEBEPAY_PERSISTENCE_CRITICAL_WRITES=enabled`
- `ZEBEPAY_MIGRATIONS_CONFIRMED=true`

Do not bypass a blocker. Fix the failed validation path in staging, re-run the PostgreSQL smoke harness, then restart the API with the confirmed flag set.

## Login Fails

The sandbox login boundary checks the seed user records and sandbox password hashes.

Seed identities:

- `adaeze@example.com`
- `ops@zebepay.example`
- `compliance@zebepay.example`

Production buyers must replace the sandbox credential store with their identity provider, MFA, password/PIN policy, and session issuance.

## Transfer Returns `requires_review`

This is expected when the risk engine detects missing OTP, untrusted device, large tier-relative amount, or repeated similar transfer behavior.

Use:

- `GET /v1/admin/transfers/review-queue`
- `POST /v1/admin/transfers/:transferId/release`
- `POST /v1/admin/transfers/:transferId/reject`

## Transfer Fails

Check:

- Source account exists.
- Source account status is `active`.
- Amount is greater than zero.
- Beneficiary account number is 10 digits.
- Beneficiary bank code exists in the bank directory.
- Customer KYC tier allows the amount.
- Available balance is sufficient.
- Idempotency key is unique for a new transfer.

## Statement Is Empty

Check:

- The account ID exists.
- Date filters are valid ISO-compatible dates.
- Ledger entries exist inside the selected range.

## Admin Operation Denied

Check:

- `Authorization: Bearer <admin-session-token>` is present.
- Admin user is active.
- Admin role has the required permission.

Examples:

- Account freeze requires `accounts:freeze`.
- Transfer reversal requires `transfers:reverse`.
- Transfer release/reject requires `transfers:review`.
- KYC decision requires `kyc:write`.

## Notifications Do Not Send

Phase 6 includes an outbox, not a live delivery worker. Production buyers must connect SMS, email, push, or in-app delivery workers.

## Production Warning

Do not go live until secrets, auth, database persistence, provider adapters, monitoring, rate limits, legal review, security review, and compliance approvals are complete.
