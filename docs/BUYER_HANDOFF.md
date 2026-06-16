# Zebepay Buyer Handoff

## What This Product Is

Zebepay is a commercial source-code platform for building Nigerian banking, wallet, cooperative finance, agency banking, and payment products.

## What The Buyer Receives

- Customer banking web app.
- Admin operations web app.
- Backend API service.
- Shared banking types and validation helpers.
- PostgreSQL-compatible schema.
- Ledger, transfer, KYC, risk, notification, and audit workflows.
- Buyer setup, deployment, API, troubleshooting, sales, and release documentation.

## Recommended First Review

1. Read `README.md`.
2. Read `docs/PRODUCT_BLUEPRINT.md`.
3. Run `docs/SETUP_GUIDE.md`.
4. Review `docs/API_REFERENCE.md`.
5. Review `docs/DEPLOYMENT_GUIDE.md`.
6. Review `release/RELEASE_CHECKLIST.md`.
7. Review `docs/LICENSE_TERMS_DRAFT.md`.
8. Review `docs/PHASE-021-POSTGRES-PRODUCTION-READINESS-GATE.md`.

## First Operator Verification

1. Install dependencies with `npm install --include=dev`.
2. Run `npm run build`, `npm run lint`, and `npm test`.
3. Copy `.env.example` to `.env`.
4. Run the apps with `npm run dev`.
5. Confirm `GET /health` and sandbox customer/admin login.
6. Apply `db/migrations/001_core_banking_schema.sql` to a disposable or staging PostgreSQL database.
7. Run `npm run smoke:postgres -- --seed`, then `npm run smoke:postgres`.
8. Confirm `GET /ready` and `GET /v1/admin/production-readiness` before enabling production traffic.

## Buyer Verification Commands

Use these commands for the first buyer-side verification:

```bash
npm install --include=dev
npm run build
npm run lint
npm test
npm run smoke:postgres
```

If dependency audit advisories appear, record them as dependency-hardening
items. Do not force breaking upgrades without MD approval.

## Buyer Responsibilities

The buyer is responsible for:

- Banking/payment licensing.
- Regulated provider contracts.
- KYC/AML provider setup.
- Legal and compliance review.
- Production security audit.
- Production hosting.
- Monitoring and support operations.
- Final go-live approval.

## Customization Priorities

Highest priority:

- Replace sandbox auth with production auth.
- Complete production identity, MFA, password/PIN policy, and session lifecycle.
- Complete PostgreSQL backup, restore, retention, and migration operations.
- Connect OTP and notification providers.
- Connect KYC provider.
- Connect funding and payout providers.
- Implement webhook signature checks.
- Add Redis-backed queues and rate limits.

Next priority:

- Expand customer onboarding.
- Add transaction receipts.
- Add reconciliation exports.
- Add dispute case management.
- Add support ticket integration.
- Add production observability.

## Commercial Positioning

Zebepay should be sold as a serious fintech foundation, not as a licensed bank or instant live banking product.

Suggested positioning:

"A Nigerian banking and wallet infrastructure foundation with customer app, admin console, API, ledger, KYC, transfer risk controls, and buyer-ready documentation."
