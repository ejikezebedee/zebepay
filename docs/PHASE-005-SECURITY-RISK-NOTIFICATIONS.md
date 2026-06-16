# Phase 5 - Security, Risk, And Notification Controls

Phase 5 adds the controls needed before a banking platform can be treated as more than a demo workflow. The implementation remains provider-neutral and sandbox-safe, while creating clear replacement points for licensed production services.

## Delivered Controls

- Trusted customer-device registration.
- OTP challenge creation and verification boundary.
- Transfer risk scoring with low, medium, high, and critical levels.
- Manual review holds for risky transfers.
- Admin transfer review queue.
- Admin release and rejection actions for held transfers.
- Notification outbox for customer-facing banking events.
- Transfer records now store risk score, risk level, risk reasons, device ID, OTP challenge ID, and review metadata.
- PostgreSQL schema now includes customer devices, OTP challenges, notifications, and risk-review transfer columns.

## Security Flow

1. Customer registers or reuses a trusted device.
2. Customer creates and verifies an OTP challenge for the money-moving action.
3. Transfer request reaches the API with device and OTP context.
4. Risk engine scores the transfer using device trust, OTP state, customer tier, and recent similar transfers.
5. Low-risk transfers post immediately through the ledger.
6. High-risk transfers move to `requires_review`.
7. Operations users with `transfers:review` permission release or reject held transfers.
8. Notifications and audit events are queued for every important security decision.

## Provider Replacement Points

Sandbox OTP challenges generate six-digit codes, API responses redact the code, and accepted transfer attempts consume verified OTP challenges so they cannot be reused for another transfer. Production buyers must replace sandbox delivery with a licensed SMS, email, push, or authenticator provider. Notification delivery is intentionally queued in memory for now; production buyers should connect a worker and durable queue.

Recommended production adapters:

- SMS OTP provider.
- Email provider.
- Push notification provider.
- Device fingerprinting provider.
- Fraud/risk scoring provider.
- Redis or queue-backed notification worker.

## API Surface Added

- `POST /v1/security/devices/trust`
- `POST /v1/security/otp-challenges`
- `POST /v1/security/otp-challenges/:challengeId/verify`
- `GET /v1/admin/transfers/review-queue`
- `POST /v1/admin/transfers/:transferId/release`
- `POST /v1/admin/transfers/:transferId/reject`
- `GET /v1/notifications?customerId=...`

## Verification

Phase 5 verification passed:

- `npm run build`
- `npm test`
- Fastify route smoke for trusted device and OTP authentication boundaries, OTP response redaction, successful low-risk transfer, high-risk transfer hold, protected notification listing, admin review queue, admin release, and admin rejection.

## Commercial Boundary

This phase does not claim regulated production readiness by itself. Buyers remain responsible for licensing, bank/payment provider contracts, KYC/AML provider onboarding, penetration testing, legal review, and regulator-facing approvals.
