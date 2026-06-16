# Zebepay Public And Private Packaging Plan

## Decision

Zebepay should be sold as a private commercial source-code foundation, not as
public open-source software and not as a live regulated payment processor.

## Repository Model

Recommended structure:

- `zebepay-public`: public marketing wrapper only.
- `zebepay`: private full source-code repository for approved buyer delivery.

The public wrapper may contain:

- Product summary.
- Buyer-safe screenshots.
- Commercial positioning.
- Buyer FAQ.
- Pricing teaser or "price by approved package" language.
- Contact and evaluation request instructions.
- Compliance and production-use caveats.

The private repository may contain:

- Full source code.
- Customer app, admin app, backend API, shared packages, and database files.
- Setup, deployment, API, security, release, and buyer handoff documentation.
- Buyer ZIP and SHA256 checksum when MD approves delivery.
- License and support scope files.

## Buyer Tiers

### Tier 1 - Code Review Access

- Private GitHub read-only access.
- README, architecture docs, API docs, and buyer caveats.
- No deployment support.
- Limited review period approved by MD.

### Tier 2 - Source Code Buyer Package

- Full private repository access.
- Commercial buyer ZIP with SHA256 checksum.
- Setup guide.
- Deployment guide.
- API reference.
- Buyer handoff guide.
- Basic setup support within the approved scope.

### Tier 3 - White-Label And Setup Support

- Everything in Tier 2.
- Branding customization.
- Deployment support.
- Provider integration guidance.
- Admin and customer UI customization.
- Extended support window approved by MD.

## Approved Positioning

Use this wording:

Zebepay is a buyer-ready Nigerian wallet and banking infrastructure source-code
foundation with customer app, admin operations dashboard, backend API,
PostgreSQL production-readiness gate, KYC workflow, transfer review, audit
logs, and provider integration surfaces.

Do not call Zebepay:

- A complete bank.
- A licensed payment gateway.
- A ready-to-launch payment processor.
- A CBN/NIBSS-ready live system.
- Production-ready regulated fintech.

## Delivery Gate

Public visibility, buyer access, release tagging, ZIP attachment, source-code
delivery, and sale terms remain gated by MD approval.
