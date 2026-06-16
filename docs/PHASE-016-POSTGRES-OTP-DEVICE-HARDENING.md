# Phase 16: PostgreSQL OTP And Device Hardening

Phase 16 aligns the customer security endpoints with PostgreSQL transfer validation.

## Added

- PostgreSQL-backed trusted-device registration for `POST /v1/security/devices/trust`.
- PostgreSQL-backed OTP challenge creation for `POST /v1/security/otp-challenges`.
- PostgreSQL-backed OTP verification for `POST /v1/security/otp-challenges/:challengeId/verify`.
- OTP codes are stored as hashes in PostgreSQL, not plaintext.
- Sandbox OTP delivery is queued through the `notifications` table so the API response still redacts the code.
- Audit events are written for device trust, OTP creation, OTP verification, and sandbox OTP delivery.
- The PostgreSQL smoke harness now creates an OTP through the API, reads the sandbox delivery notification, verifies the OTP through the API, and uses that verified challenge for the successful transfer.

## Runtime Behavior

Memory mode keeps the existing sandbox behavior for buyer demos and local tests.

PostgreSQL mode writes these security records durably:

- `customer_devices`
- `otp_challenges`
- `notifications`
- `audit_events`

The transfer transaction then validates the same PostgreSQL `customer_devices` and `otp_challenges` records before allowing a successful money-movement write.

## Smoke Command

Use a disposable validation database:

```bash
export DATABASE_URL="postgres://zebepay_user@localhost:5432/zebepay_validation"
export ZEBEPAY_SANDBOX_SESSION_SECRET="test-zebepay-sandbox-session-secret"
npm run smoke:postgres -- --seed
```

Expected result:

```text
Phase 16 PostgreSQL OTP/device smoke passed.
```

## Production Notes

The bundled OTP notification path is for sandbox validation only. Before live use, buyers must replace it with an approved OTP/SMS/push provider, set a private `ZEBEPAY_OTP_HASH_PEPPER`, complete rate limiting, complete monitoring, and pass legal, compliance, and security review.
