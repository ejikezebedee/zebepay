# Security Policy

Zebepay is a commercial source-code package for Nigerian banking and wallet product development. It is not approved for live regulated use without buyer-led security, compliance, and provider review.

## Supported Version

| Version | Status |
| --- | --- |
| 0.1.0 package candidate | Buyer evaluation and customization |

## Security Boundary

The package includes security-oriented foundations:

- Role-based admin permissions.
- Audit-event logging.
- Account freeze/unfreeze workflow.
- Transfer idempotency.
- Transfer reversal workflow.
- Trusted-device model.
- OTP challenge boundary.
- Transfer risk scoring and manual review holds.
- Notification outbox.

The buyer must implement production controls:

- Password and PIN hashing.
- Real JWT/session management with refresh rotation.
- Rate limiting.
- Secrets manager.
- Provider webhook signature verification.
- Durable database repositories.
- Queue-backed background workers.
- Production logging and monitoring.
- Penetration testing and independent code review.

## Sensitive Data

Do not log or expose:

- Full BVN.
- Full NIN.
- OTP codes.
- Passwords or PINs.
- Provider credentials.
- Access or refresh tokens.
- Private keys.
- Bank-provider secrets.

## Reporting Issues

For a private commercial deployment, route vulnerabilities through the buyer's internal security process. For seller-maintained package issues, report privately to the package owner before public disclosure.

## Production Warning

Do not launch with placeholder secrets, sandbox OTP behavior, sandbox auth tokens, in-memory repositories, or unsigned webhooks.
