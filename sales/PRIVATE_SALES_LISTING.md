# Zebepay Private Sales Listing

## Product Title

Zebepay - Nigerian Banking & Wallet Infrastructure Foundation

## Product Image

Use `assets/marketplace/zebepay-product-cover.png` as the primary product-gallery image.

## Short Subtitle

Customer app, admin dashboard, backend API, ledger workflows, KYC-ready fields, transfer controls, and buyer documentation for Nigerian fintech builds.

## Buyer Pain Point

Most fintech templates stop at polished screens. Buyers still need the banking domain layer: wallet/account records, kobo money handling, ledger logic, KYC states, transfer risk controls, admin review, audit logs, notification events, setup documentation, and production caveats.

Zebepay gives buyers a serious source-code foundation so they can start from a structured fintech product instead of a blank repository.

## Product Positioning

Zebepay is a commercial source-code package for founders, agencies, developers, cooperatives, and licensed financial operators building Nigerian wallet, neobank, agency banking, cooperative savings, or payment products.

This is software only. It does not include a banking license, direct payment-rail access, legal approval, production security certification, or regulated provider authorization.

## What Buyers Get

- Customer banking web app.
- Admin operations dashboard.
- Backend API service.
- Shared Nigerian banking types and helpers.
- PostgreSQL-compatible schema.
- NGN/kobo money handling.
- Nigerian bank-code directory.
- BVN/NIN-ready KYC fields.
- Wallet/account workflow.
- Ledger posting model with transfer, reversal, and production double-entry
  hardening path.
- Transfer, reversal, risk-hold, and admin-release flows.
- OTP challenge and trusted-device workflows.
- Notification outbox model.
- Audit trail boundaries.
- Provider adapter structure for licensed integrations.
- Setup, deployment, API, troubleshooting, handoff, demo, release, and security documentation.
- GitHub buyer-support contact path with issue templates and support boundary
  documentation.

## Latest Package Note

The current buyer package is `v0.1.0-github-ready`, refreshed on 2026-06-16
after final GitHub packaging and Zebepay brand-alignment cleanup. The release
hardens OTP reuse protection, OTP API redaction, admin password-hash redaction,
production session-secret validation, transfer conflict handling, PostgreSQL
readiness gates, and buyer-facing release separation.

## Ideal Buyers

- Fintech founders validating a Nigerian wallet or neobank concept.
- Software agencies delivering fintech client projects.
- Licensed financial operators needing a modern product base.
- Cooperative and savings platforms modernizing member finance tools.
- Developers who need banking workflow structure, not only UI screens.

## Practical Use Cases

- Launch a sandbox fintech demo for investors or clients.
- Build a customer wallet and admin review workflow.
- Prototype licensed provider integrations.
- Use the API and database model as a fintech starter architecture.
- Deliver a client-specific Nigerian fintech project faster.

## Package Contents

```text
apps/customer-web/      Customer banking app
apps/admin-web/         Admin operations dashboard
services/api/           Backend API service
packages/shared/        Shared types, constants, and helpers
db/                     PostgreSQL schema notes and migration
docs/                   Product, setup, API, deployment, and handoff docs
sales/                  Sales listing, FAQ, pricing, and launch assets
release/                Release checklist, audit, and package manifest
```

## Setup Summary

1. Install Node.js 20+.
2. Install dependencies with `npm install --include=dev`.
3. Copy `.env.example` to `.env` and adjust local values.
4. Run `npm run build`.
5. Run `npm test`.
6. Start the customer app, admin app, and API using the workspace scripts in `docs/SETUP_GUIDE.md`.

## Buyer Contact And Support

Buyer contact is handled through GitHub after approved access:

- Pre-sale questions: GitHub discussion or `Pre-sale question` issue template.
- Paid buyer setup support: private-repository `Buyer support request` issue
  template.
- Security concerns: `SECURITY.md`.
- Custom implementation, provider integration, deployment, or production
  hardening: separate paid scope.

Support does not include legal advice, banking/payment licensing, regulated
provider approval, live payment operations, production security certification,
or custom development unless a separate paid agreement is approved.

## Example Buyer Workflow

1. Review `README.md` and `docs/PRODUCT_BLUEPRINT.md`.
2. Run the product locally.
3. Review API endpoints in `docs/API_REFERENCE.md`.
4. Review production caveats in `SECURITY.md`.
5. Select licensed providers for KYC, OTP, notifications, funding, and payout.
6. Replace sandbox auth and repository layers before live deployment.

## Compliance Notice

Zebepay must not be marketed as a licensed bank, regulated financial institution, payment processor, legal opinion, compliance certification, or production security certification. Buyers are responsible for all licenses, provider agreements, compliance review, production security review, and go-live approval.

## Suggested Pricing

- Tier 1 - Builder License: EUR 5,000.
- Tier 2 - Commercial Launch License: EUR 10,000.
- Tier 3 - Enterprise / Investor-Grade Package: EUR 20,000.

The pricing is justified by source-code ownership, time saved on product
architecture, workflow design, app scaffolding, API structure, Nigerian banking
assumptions, provider adapter design, buyer documentation, and commercial
handoff material.

## Why Buyers Choose This Instead Of Paystack

Paystack is useful when the buyer only needs hosted payment acceptance. Zebepay
NG is for buyers who want to own and customize a fintech infrastructure
foundation.

The package gives buyers app surfaces, backend workflow boundaries, provider
adapter architecture, KYC workflow structure, ledger boundaries, audit controls,
and documentation they can adapt into their own approved product.

## Suggested Private Sales Description

Zebepay is a Nigerian banking and wallet infrastructure source-code
foundation for founders, agencies, developers, cooperatives, and licensed
operators.

It includes a customer banking app, admin operations dashboard, backend API, shared banking domain package, PostgreSQL-compatible schema, NGN/kobo money handling, KYC-ready fields, ledger architecture, transfer risk controls, notification workflow, audit boundaries, and buyer-ready documentation.

Use it as a serious foundation for Nigerian fintech products. Connect your own licensed providers, complete legal/compliance review, perform a production security audit, and customize the code for your business before going live.

## Suggested Refund Policy Draft

Because this is a digital source-code package, refunds should be limited to duplicate purchases, broken downloads that cannot be resolved, or a clearly incorrect file delivery. Refunds should not cover buyer misunderstanding of licensing, regulated provider requirements, or production readiness obligations when those terms are stated on the product page.

Final refund terms require MD approval before public sale.
