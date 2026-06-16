# Zebepay Package Manifest

## Root

- `README.md` - Product overview and documentation index.
- `LICENSE` - Proprietary commercial source license notice.
- `CHANGELOG.md` - Release history.
- `SECURITY.md` - Security policy and production warnings.
- `SUPPORT.md` - Buyer contact and support routing.
- `.env.example` - Portable local environment template.
- `package.json` - Workspace scripts.
- `.github/` - GitHub issue templates, pull request template, and CI workflow.

## Apps

- `apps/customer-web/` - Customer banking interface.
- `apps/admin-web/` - Admin operations console.

## Marketplace Assets

- `assets/marketplace/zebepay-product-cover.png` - Primary product cover image for marketplace, GitHub, and sales-page use.
- `artifacts/screenshots/customer-dashboard.png` - Customer portal verification screenshot.
- `artifacts/screenshots/admin-console.png` - Admin console verification screenshot.

## API And Shared Code

- `services/api/` - Backend API and banking domain services.
- `packages/shared/` - Shared banking types, constants, and helpers.

## Database

- `db/README.md` - Database notes.
- `db/migrations/001_core_banking_schema.sql` - PostgreSQL-compatible schema.

## Documentation

- `docs/PRODUCT_BLUEPRINT.md`
- `docs/ARCHITECTURE.md`
- `docs/NIGERIA_BANKING_MODEL.md`
- `docs/STANDARD_CHARTERED_BENCHMARK.md`
- `docs/API_REFERENCE.md`
- `docs/SETUP_GUIDE.md`
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/TROUBLESHOOTING.md`
- `docs/BUYER_HANDOFF.md`
- `docs/DEMO_VIDEO_SCRIPT.md`
- `docs/PAYSTACK_DIFFERENTIATION.md`
- `docs/LICENSE_TERMS_DRAFT.md`
- `docs/RELEASE_NOTES.md`
- `docs/GITHUB_DELIVERY.md`
- `docs/GITHUB_BUYER_ACCESS_MODEL.md`
- `docs/BRAND_GOVERNANCE.md`
- `docs/ROADMAP.md`

## Phase Reports

- `docs/PHASE-002-BANKING-CORE.md`
- `docs/PHASE-003-OPERATIONS-COMPLIANCE.md`
- `docs/PHASE-004-REPOSITORIES-TESTS-CUSTOMER-BANKING.md`
- `docs/PHASE-005-SECURITY-RISK-NOTIFICATIONS.md`
- `docs/PHASE-006-BUYER-PACKAGE.md`
- `docs/PHASE-007-GITHUB-DELIVERY.md`
- `docs/PHASE-008-MARKETPLACE-LAUNCH.md`
- `docs/PHASE-009-BUYER-FULFILLMENT.md`
- `docs/PHASE-010-COMMERCIAL-DECISION-GATE.md`
- `docs/PHASE-011-PRODUCT-IMAGE-ASSET.md`
- `docs/PHASE-012-BUYER-DEAL-ROOM.md`
- `docs/PHASE-013-COMMERCIAL-PRODUCT-INTEGRITY-AUDIT.md`
- `docs/PHASE-014-DURABLE-STORAGE-PERSISTENCE.md`
- `docs/PHASE-015-POSTGRES-REPOSITORY-HARNESS.md`
- `docs/PHASE-016-ASYNC-REPOSITORY-CUTOVER.md`
- `docs/PHASE-016-POSTGRES-OTP-DEVICE-HARDENING.md`
- `docs/PHASE-017-POSTGRES-TRANSFER-TRANSACTION.md`
- `docs/PHASE-018-POSTGRES-ADMIN-TRANSACTIONS.md`
- `docs/PHASE-019-POSTGRES-SMOKE-HARNESS.md`
- `docs/PHASE-020-POSTGRES-AUTH-SESSION-CUTOVER.md`
- `docs/PHASE-021-POSTGRES-PRODUCTION-READINESS-GATE.md`
- `docs/PHASE-022-RELEASE-HARDENING-BUYER-HANDOFF.md`
- `docs/PHASE-023-GITHUB-COMMERCIAL-PACKAGING.md`
- `docs/PHASE-024-ZEBEPAY-BRAND-ALIGNMENT.md`
- `docs/PHASE-025-PRIVATE-GITHUB-DELIVERY.md`

## Sales And Release

- `sales/SALES_PAGE_COPY.md`
- `sales/PRIVATE_SALES_LISTING.md`
- `sales/CONTROLLED_SALES_CONVERSION_PACK.md`
- `sales/BUYER_FAQ.md`
- `sales/LAUNCH_ASSETS.md`
- `sales/DEAL_ROOM.md`
- `sales/POST_PURCHASE_EMAILS.md`
- `sales/SUPPORT_POLICY_DRAFT.md`
- `sales/PRICING_PACKAGES.md`
- `sales/COMMERCIAL_TERMS_DRAFT.md`
- `release/RELEASE_CHECKLIST.md`
- `release/FINAL_RELEASE_AUDIT.md`
- `release/GITHUB_RELEASE_BODY.md`
- `release/GITHUB_REPOSITORY_CHECKLIST.md`
- `release/PACKAGE_MANIFEST.md`
- `release/MARKETPLACE_LAUNCH_CHECKLIST.md`
- `release/BUYER_FULFILLMENT_CHECKLIST.md`
- `release/COMMERCIAL_DECISION_RECORD.md`
- `release/BUYER_ACCESS_SOP.md`
- `.github/ISSUE_TEMPLATE/` - Buyer support, pre-sale, and security routing
  templates for approved GitHub support use.
- `.github/pull_request_template.md` - Commercial safety and verification
  checklist for collaborator changes.
- `.github/workflows/ci.yml` - GitHub Actions build, lint, and test workflow.

## Current Delivery Artifact

- `public-downloads/zebepay-v0.1.0-github-ready-20260616.zip` - GitHub-ready
  Zebepay buyer package artifact.
- `public-downloads/zebepay-v0.1.0-github-ready-20260616.zip.sha256` -
  SHA-256 checksum for the GitHub-ready Zebepay buyer package artifact.

## Excluded From Buyer Package

- `node_modules/`
- `dist/`
- `.next/`
- `.env`
- Local logs.
- Local temporary files.
- Local runtime logs and PID files.
- Any production secrets.
