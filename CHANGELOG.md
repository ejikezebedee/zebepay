# Changelog

## 0.1.0 - Package Candidate

### Added

- Full monorepo structure for customer web, admin web, API service, shared package, database, docs, sales, and release assets.
- Customer banking dashboard with balance, KYC tier, trusted-device signal, beneficiaries, transfer preparation, statements, and alerts.
- Admin operations console with KYC, risk holds, transaction supervision, audit, and risk-gate views.
- API service with customer/auth, beneficiary, statement, transfer, admin, security, notification, and reference routes.
- Shared Nigerian banking primitives: NGN/kobo formatting, KYC tiers, bank codes, transaction statuses, admin roles, audit events, risk, OTP, device, and notification types.
- In-memory repositories and unit-of-work boundary for sandbox execution and tests.
- PostgreSQL adapter boundary and core migration.
- Ledger posting, transfer idempotency, reversal flow, KYC decision flow, account freeze/unfreeze, risk review hold, admin release/reject, OTP challenge, trusted device, and notification outbox.
- Buyer package documentation: setup, deployment, API reference, troubleshooting, demo video script, buyer handoff, license draft, release notes, release checklist, sales copy, and final release audit.
- Marketplace launch package: private sales listing, buyer FAQ, launch assets, marketplace checklist, and Phase 8 marketplace launch report.
- Buyer fulfillment package: access checklist, post-purchase email templates, support policy draft, and Phase 9 buyer fulfillment report.
- Commercial decision-gate package: pricing tiers, commercial terms draft, decision record, buyer access SOP, and Phase 10 commercial decision report.
- Product image asset package: marketplace cover image, launch asset update, private sales channel image reference, package manifest update, and Phase 11 product image report.
- PostgreSQL production readiness package: transfer writes, admin writes, auth/session reads, audit-event persistence, full production startup gate, smoke harness, and Phase 22 buyer handoff hardening.
- GitHub commercial packaging package: GitHub release body, repository checklist, pull request template, CI workflow, controlled sales conversion pack, and Phase 23 evidence note.
- Zebepay brand alignment package: repository rename, package metadata rename, workspace scope rename, environment-prefix rename, brand-governance note, and Phase 24 evidence note.

### Verification

- Build passes.
- Automated tests pass.
- API smoke tests covered customer login, beneficiaries, statements, OTP, device trust, low-risk transfer success, high-risk transfer hold, admin release, and notifications.
- Commercial cleanup scan found no internal paths, private infrastructure references, or secret patterns in buyer-facing files.

### Known Limits

- Production auth provider integration, password/PIN policy hardening, JWT refresh rotation, Redis queues/rate limits, provider integrations, webhook signatures, database backup/restore operations, and buyer-specific compliance controls must be completed by the buyer before live use.
- Zebepay is source-code software only. It does not provide a banking license, regulated provider access, legal advice, compliance certification, or live payment-rail authorization.
