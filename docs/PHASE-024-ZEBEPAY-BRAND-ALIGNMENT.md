# Phase 24 - Zebepay Brand Alignment And Separation

Date: 2026-06-16

## Objective

Resolve the product-name conflict before GitHub delivery by making Zebepay the
single commercial identity across code, documentation, sales material, release
assets, package metadata, and buyer handoff instructions.

## Decision

Zebepay is the active product and repository identity.

AgentPay is treated as an earlier working name from the historical marketplace
and backend-service workstream. OpenBank NG is treated as an interim package
name from the banking/wallet hardening workstream. Neither legacy name should
be used as the buyer-facing product name for this GitHub release.

## Work Completed

- Renamed the active package directory from `projects/openbank-ng` to
  `projects/zebepay`.
- Updated root package metadata from `openbank-ng` to `zebepay`.
- Updated GitHub repository references to
  `https://github.com/ejikezebedee/zebepay`.
- Updated NPM workspace names and dependencies from `@openbank-ng/*` to
  `@zebepay/*`.
- Updated app titles, service names, shared product constants, API imports, and
  TypeScript Fastify store naming to Zebepay.
- Updated environment flags from `OPENBANK_` to `ZEBEPAY_`.
- Updated demo credentials and sandbox examples from OpenBank naming to
  Zebepay naming.
- Renamed the marketplace product image reference from
  `openbank-ng-product-cover.png` to `zebepay-product-cover.png`.
- Updated buyer-facing docs, sales copy, release notes, support files, GitHub
  delivery files, and commercial package references to Zebepay.
- Added `docs/BRAND_GOVERNANCE.md` to prevent future naming drift.

## Separation Standard

The release package now follows this separation:

```text
apps/       Buyer-visible customer and admin web apps
services/   Backend API and banking domain services
packages/   Shared Zebepay types and validation logic
db/         Schema, migrations, and seeds
docs/       Product, setup, architecture, compliance, and phase evidence
sales/      private sales channel, buyer FAQ, sales page, pricing, and support copy
release/    GitHub, package, fulfillment, audit, and launch checklists
.github/    GitHub issue templates, pull request template, and CI workflow
```

## Release Gate

Zebepay is ready for the next verification pass after Phase 24 naming cleanup.
Do not publish, push, invite buyers, make the repository public, attach release
artifacts, or launch private sales channel until MD approves that action.
