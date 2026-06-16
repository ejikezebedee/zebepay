# Zebepay API Reference

Base URL in local development:

```text
http://localhost:4000
```

All money amounts are integer kobo. `100000` means NGN 1,000.00.

## Health And Product

### `GET /health`

Returns service health.

### `GET /v1/product`

Returns product identity, market, currency, and commercial boundary.

## Authentication

### `POST /v1/auth/customer/login`

Body:

```json
{
  "email": "adaeze@example.com",
  "password": "ZebepayDemo!2026"
}
```

Returns customer profile and sandbox bearer session. Production buyers must replace the sandbox token with a real JWT/session provider.

### `POST /v1/auth/admin/login`

Body:

```json
{
  "email": "ops@zebepay.example",
  "password": "ZebepayAdmin!2026"
}
```

Returns admin profile and sandbox bearer session.

## Customers And Accounts

### `GET /v1/customers`

Requires an admin bearer token with customer-read permission. Returns seed customers.

### `GET /v1/customers/:customerId/summary`

Requires that customer's bearer token. Returns a customer profile with accounts, transfers, and recent ledger entries. Use the beneficiaries endpoint for beneficiary records.

## Beneficiaries

### `GET /v1/customers/:customerId/beneficiaries`

Requires that customer's bearer token. Lists active and disabled beneficiaries for a customer.

### `POST /v1/beneficiaries`

Requires that customer's bearer token.

Body:

```json
{
  "customerId": "cus_001",
  "name": "Chinedu Okeke",
  "accountNumber": "0123456789",
  "bankCode": "000027"
}
```

### `DELETE /v1/customers/:customerId/beneficiaries/:beneficiaryId`

Disables a beneficiary.

## Security

### `POST /v1/security/devices/trust`

Requires a customer bearer token.

Body:

```json
{
  "label": "Primary phone",
  "fingerprint": "buyer-device-fingerprint"
}
```

### `POST /v1/security/otp-challenges`

Body:

```json
{
  "purpose": "transfer",
  "targetId": "acct_001"
}
```

Requires a customer bearer token. The response includes a challenge ID but never returns the OTP code. In PostgreSQL mode, the sandbox delivery message is queued in `notifications` for validation; production buyers must replace that delivery path with an approved OTP provider. Accepted transfer attempts consume verified transfer OTP challenges so they cannot be reused.

### `POST /v1/security/otp-challenges/:challengeId/verify`

Body:

```json
{
  "code": "<delivered-code>"
}
```

## Transfers

### `GET /v1/transfers`

Requires a customer bearer token. Lists transfers for the authenticated customer's accounts.

### `POST /v1/transfers`

Requires a customer bearer token. The authenticated customer must own the source account.

Body:

```json
{
  "sourceAccountId": "acct_001",
  "amountKobo": 120000,
  "beneficiaryName": "Chinedu Okeke",
  "beneficiaryAccountNumber": "0123456789",
  "beneficiaryBankCode": "000027",
  "narration": "Invoice payment",
  "channel": "nip_mock",
  "idempotencyKey": "unique-transfer-key-0001",
  "customerDeviceId": "dev_001",
  "otpChallengeId": "otp_generated_for_transfer"
}
```

Possible statuses:

- `successful`
- `failed`
- `requires_review`
- `reversed`

High-risk transfers enter `requires_review` and wait for admin release or rejection.

When `ZEBEPAY_STORAGE_MODE=postgres`, transfer creation fails closed with `TRANSFER_CUTOVER_REQUIRED` until `ZEBEPAY_POSTGRES_TRANSFER_WRITES=enabled`. With that explicit flag enabled, transfer creation uses the PostgreSQL transaction path for transfer, account debit, ledger entry, idempotency, OTP consumption, audit event, and notification queue writes.

## Funding And Payout Provider Workflows

These routes expose sandbox provider handoff records. Production buyers must replace the sandbox adapter with licensed funding, payout, webhook, and settlement providers.

### `POST /v1/funding/intents`

Requires a customer bearer token.

Body:

```json
{
  "amountKobo": 2500000,
  "provider": "sandbox_bank_transfer"
}
```

Returns a funding intent with `pending_provider_confirmation` status, reference, expiry, and sandbox virtual account number.

### `POST /v1/payouts/dispatches`

Requires a customer bearer token and an owned active source account.

Body:

```json
{
  "sourceAccountId": "acct_001",
  "amountKobo": 1000000,
  "beneficiaryAccountNumber": "0123456789",
  "beneficiaryBankCode": "000027",
  "provider": "sandbox_nip"
}
```

Returns a payout dispatch with `pending_provider_dispatch` status for provider handoff.

## Statements

### `GET /v1/accounts/:accountId/statement?from=2026-01-01&to=2026-12-31`

Requires a customer bearer token for the account owner. Returns opening balance, closing balance, total debits, total credits, and ledger entries.

## Admin Operations

Admin protected sandbox routes use the bearer token returned by `POST /v1/auth/admin/login`. Production buyers must replace this with hardened admin identity, MFA, and authorization middleware.

### `GET /v1/admin/users`

Lists admin users.

### `GET /v1/admin/audit-events`

Lists audit events.

### `GET /v1/admin/reconciliation/summary`

Returns sandbox reconciliation totals for transfer status counts, ledger debit/credit totals, notification outbox count, and provider-settlement readiness.

### `GET /v1/admin/storage/status`

Returns the active storage mode, database configuration state, critical-write confirmation, migration confirmation, and critical operational record groups. Sandbox memory mode reports record counts so buyers can see which records still need durable repository wiring before production.

### `GET /v1/admin/production-readiness`

Returns production blockers for durable storage. Production is blocked until `ZEBEPAY_STORAGE_MODE=postgres`, `DATABASE_URL` is configured, `ZEBEPAY_POSTGRES_TRANSFER_WRITES=enabled`, `ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled`, `ZEBEPAY_POSTGRES_AUTH_SESSION=enabled`, `ZEBEPAY_POSTGRES_AUDIT_WRITES=enabled`, `ZEBEPAY_PERSISTENCE_CRITICAL_WRITES=enabled`, and `ZEBEPAY_MIGRATIONS_CONFIRMED=true`.

### `GET /v1/admin/kyc-reviews`

Lists KYC review cases.

### `POST /v1/admin/accounts/:accountId/freeze`

When `ZEBEPAY_STORAGE_MODE=postgres`, this write is blocked with `ADMIN_WRITE_CUTOVER_REQUIRED` until `ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled`.

Header:

```text
Authorization: Bearer <admin-session-token>
```

Body:

```json
{
  "reason": "Compliance review requested"
}
```

### `POST /v1/admin/accounts/:accountId/unfreeze`

Same body as freeze.

### `POST /v1/admin/customers/:customerId/kyc-decision`

When `ZEBEPAY_STORAGE_MODE=postgres`, this write is blocked with `ADMIN_WRITE_CUTOVER_REQUIRED` until `ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled`.

Body:

```json
{
  "decision": "approved",
  "approvedTier": "tier_2",
  "reason": "Documents verified"
}
```

### `GET /v1/admin/transfers/review-queue`

Lists transfers waiting for manual risk review.

### `POST /v1/admin/transfers/:transferId/release`

Releases a held transfer and posts the ledger debit.

When `ZEBEPAY_STORAGE_MODE=postgres`, release writes run inside the PostgreSQL admin transaction path only after `ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled`.

### `POST /v1/admin/transfers/:transferId/reject`

When `ZEBEPAY_STORAGE_MODE=postgres`, rejection writes run inside the PostgreSQL admin transaction path only after `ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled`.

Body:

```json
{
  "reason": "Customer confirmation failed"
}
```

### `POST /v1/admin/transfers/:transferId/reverse`

Reverses a successful transfer through a credit ledger entry.

When `ZEBEPAY_STORAGE_MODE=postgres`, reversal writes run inside the PostgreSQL admin transaction path only after `ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled`.

## Notifications

### `GET /v1/notifications?customerId=cus_001`

Requires that customer's bearer token. Lists queued notification records for a customer.

## Reference Data

### `GET /v1/reference/banks`

Lists supported Nigerian bank codes.
