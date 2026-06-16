# Zebepay Release Notes

## v0.1.0 Package Candidate

Zebepay is a Nigerian banking and wallet infrastructure foundation.

### Current Buyer Package

- Package: `zebepay-v0.1.0-github-ready-20260616.zip`
- SHA-256: see the adjacent `.sha256` delivery file.
- GitHub delivery target: private paid buyer repository or approved buyer fork.
- Current repository target: `https://github.com/ejikezebedee/zebepay`.
- Buyer contact path: GitHub issues/discussions using `SUPPORT.md` and the
  included issue templates.

### Included

- Customer banking web app with API-backed auth, account, transfer, statement, beneficiary, notification, device, and OTP workflow controls.
- Admin operations console with API-backed auth, customer/KYC review, transfer review, release/reject, audit, and reconciliation workflow controls.
- Backend API service.
- Shared banking domain package.
- PostgreSQL-compatible schema.
- NGN/kobo money handling.
- Nigerian bank-code support.
- BVN/NIN-ready KYC workflow.
- Account, ledger, funding intent, payout dispatch, transfer, reversal, statement, beneficiary, audit, risk, OTP, device, notification, and reconciliation workflows.
- Setup, deployment, API, troubleshooting, demo, buyer handoff, sales, private sales listing, buyer FAQ, launch assets, post-purchase email, support policy, pricing, commercial terms, and release checklist documentation.
- Changelog, security policy, package manifest, GitHub delivery guide, and final release audit.
- Marketplace launch checklist, buyer fulfillment checklist, commercial decision record, and buyer access SOP for public-sale and delivery readiness review.
- Marketplace product cover image for private sales channel, GitHub, sales-page, and launch-post use.
- Phase 13 commercial product integrity audit with implemented-vs-hardening boundary.
- Root `SUPPORT.md` and GitHub issue templates for buyer support, pre-sale
  questions, and security routing.

### Verification

- Build passes.
- Automated tests pass.
- Automated tests cover customer/admin auth boundaries, protected customer/admin read routes, statements, notification listing, OTP internal redaction and verification, OTP one-use transfer approval, device trust, transfer idempotency, transfer risk hold, admin review release/rejection, funding/payout provider workflow records, reconciliation summary protection, frozen-account release protection, reversal ledger entries, and selected service behavior.
- Latest audit hardening consumes verified transfer OTP challenges after accepted transfer attempts, keeps OTP internals out of API responses, redacts admin password hashes from API responses, blocks the default sandbox session secret in production mode, and returns transfer conflicts separately from auth failures.
- Durable-storage readiness hardening adds admin storage status, production-readiness reporting, startup blocking for memory-only production runs, sandbox retention for funding and payout handoff records, and PostgreSQL migration coverage for operational persistence records.
- PostgreSQL repository harness adds async database-backed repository implementations for customer, account, beneficiary, ledger statement, and transfer records, plus always-on mapper tests and an opt-in live database smoke command.
- Async repository cutover routes customer summaries, beneficiaries, statements, and transfer listing through the memory/PostgreSQL repository provider, while transfer creation fails closed in PostgreSQL mode until the full SQL transaction cutover is complete.
- PostgreSQL transfer transaction cutover adds an explicit `ZEBEPAY_POSTGRES_TRANSFER_WRITES=enabled` path for transfer creation, account debit, ledger entry, idempotency key, OTP consumption, audit event, and notification queue writes in one SQL transaction boundary.
- PostgreSQL admin transaction cutover adds an explicit `ZEBEPAY_POSTGRES_ADMIN_WRITES=enabled` path for account freeze/unfreeze, KYC decisions, transfer release/reject, and transfer reversal with durable audit, notification, control, and ledger writes.
- PostgreSQL production readiness gate now also requires explicit auth/session and audit persistence confirmations before `/ready` can report production-ready or production startup can pass.
- Buyer-facing documentation uses portable paths and states the commercial compliance boundary.
- Marketplace listing materials state the software-only boundary and public-sale approval gate.
- Buyer fulfillment materials state the access, support, and compliance boundaries.
- Commercial decision materials keep price, license, refund, support, and access decisions gated by MD approval.
- Product cover image avoids regulated-institution logos and approval claims.
- Buyer-facing positioning has been corrected from broad "complete platform"
  language to Nigerian banking and wallet infrastructure foundation.
- Phase 24 brand alignment confirms Zebepay as the active product, repository,
  package, workspace, environment-prefix, and buyer-facing identity.

### Known Production Gaps

The package is not a licensed bank and is not ready for live regulated use without buyer work.

Production buyers must complete:

- Production identity provider, MFA, password/PIN policy, and secret rotation.
- PostgreSQL repository wiring.
- Redis-backed queues and rate limits.
- KYC provider integration.
- OTP and notification provider integration.
- Live funding and payout provider integration.
- Webhook signature verification.
- True production double-entry ledger enforcement.
- Reconciliation reports against live licensed provider settlement records.
- Dispute/refund case management for merchant workflows.
- Monitoring, logging, incident response, and backup procedures.
- Legal, compliance, security, and provider approvals.
