# Zebepay GitHub Buyer Access Model

## Purpose

This model lets buyers inspect enough proof to trust the product before payment while keeping full source-code access gated until payment, license acceptance, and buyer approval are complete.

## Recommended Repository Structure

Use one primary GitHub repository:

1. `zebepay`
   - Visibility: private.
   - Purpose: paid buyer delivery and controlled source-code access.
   - Contains the full source package: customer app, admin app, backend API, shared package, database migration, docs, sales material, release audit, screenshots, and validated buyer ZIP/hash.
   - Buyer access is granted only after payment confirmation, accepted license terms, approved support scope, and delivery record creation.

Do not use unrelated or legacy repositories for this product. Only the approved
private Zebepay repository should receive the commercial release.

## What Buyers See Before Payment

Before payment, buyers should receive only approved proof material:

- Product README and positioning.
- Marketplace product cover image.
- Customer and admin screenshots.
- Architecture overview.
- API reference summary.
- Setup guide summary.
- Release notes.
- Buyer FAQ.
- approved sales-page copy.
- Pricing packages.
- Support policy draft.
- Buyer contact/support path.
- Commercial limitations and regulated-production caveats.
- Final release audit summary.
- Package manifest showing what paid buyers receive.

Pre-payment material must not expose:

- Full app source code.
- Backend service implementation.
- Database internals beyond a high-level schema summary, unless intentionally approved.
- Private buyer ZIP.
- Paid-only templates or delivery files.
- Secrets, logs, runtime files, internal paths, or operational metadata.

## What Paid Buyers Receive

After payment and approval, the buyer receives:

- Private GitHub repository access to `zebepay`, or a private fork created for that buyer.
- The validated buyer ZIP and `.sha256` hash.
- Full source code for the customer web app, admin web app, backend API, shared banking package, database migration, buyer documentation, and release materials.
- Setup, troubleshooting, deployment, API, and handoff documentation.
- Support only within the approved support scope.
- GitHub issue-template intake for setup support and buyer questions.

## Buyer Access Gate

Do not grant full repository access until all are true:

- Payment is confirmed.
- Buyer identity or company record is captured.
- License terms are accepted.
- Refund policy is accepted.
- Support scope is accepted.
- Delivery method is approved.
- Repository invitation target is confirmed.
- Delivery event is recorded.

## GitHub Release Plan

For the private paid repo:

1. Push the full source repository.
2. Tag the validated package as `v0.1.0-buyer-ready`.
3. Attach the validated ZIP and `.sha256` file to the private GitHub release if GitHub release delivery is approved.
4. Keep issues disabled or restricted unless paid support includes GitHub issue handling.
5. Keep discussions disabled unless community support is approved.
6. If GitHub issue support is approved, enable only the included buyer support
   and pre-sale templates.

## Recommended Default

- Private paid repo: `zebepay`
- Paid access: private GitHub invite after payment and license acceptance.
- Release artifact: validated ZIP plus hash attached only inside the private repo.
- Buyer access: no unpaid full-source access.
