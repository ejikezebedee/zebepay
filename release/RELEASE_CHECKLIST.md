# Zebepay Release Checklist

## Commercial Readiness

- [x] Clear title and positioning
- [x] Buyer pain point documented
- [x] Product promise documented
- [x] Target buyers documented
- [x] Pricing rationale included
- [x] Sales page copy included
- [x] FAQ included
- [ ] License terms approved by MD
- [x] Buyer compliance notice included
- [x] License terms draft included

## Product Completeness

- [x] Customer app implemented
- [x] Admin app implemented
- [x] Backend API implemented
- [x] Database schema implemented
- [x] Ledger engine implemented
- [x] Provider adapter system implemented
- [x] KYC workflow implemented
- [x] Transaction lifecycle implemented
- [x] Demo data included
- [x] Tests included
- [x] API docs included
- [x] Setup guide included
- [x] Deployment guide included

## Nigerian Banking Readiness

- [x] NGN/kobo money handling
- [x] Nigerian phone normalization
- [x] Nigerian bank code directory
- [x] NUBAN-style account-number support
- [x] BVN/NIN-ready KYC fields
- [x] KYC tier limits
- [x] NIP/NIBSS-style transfer statuses
- [ ] Funding provider adapter
- [ ] Payout provider adapter
- [ ] Webhook signature verification pattern
- [x] Reconciliation workflow

## Security And Compliance Warnings

- [x] No hardcoded secrets
- [x] No private keys or tokens
- [x] No internal server paths
- [x] No local agent/workspace paths
- [x] No machine-specific home-directory paths
- [x] No private emails
- [x] No misleading banking-license claims
- [x] No GTBank or Standard Chartered branding/assets
- [x] Buyer compliance responsibilities stated
- [x] Production audit warning included

## GitHub Delivery Gate

- [x] Repository destination selected
- [x] Branch strategy selected
- [x] README complete
- [x] `.env.example` complete
- [x] Portable setup instructions
- [x] Tests or verification notes included
- [x] Release notes included
- [x] GitHub-ready locally
- [x] Changelog included
- [x] Security policy included
- [x] Package manifest included
- [x] Final release audit included
- [x] GitHub delivery guide included
- [x] GitHub release body included
- [x] GitHub repository checklist included
- [x] GitHub pull request template included
- [x] GitHub CI workflow included
- [x] controlled sales conversion pack included

## Phase 6 Release Audit Notes

- Buyer-facing setup, deployment, API, troubleshooting, handoff, demo, sales, and release checklist files are present.
- Documentation uses portable relative paths.
- Buyer compliance and production-security responsibilities are stated.
- Final public release remains gated by Phase 7 delivery polish and MD approval.

## Phase 7 Release Audit Notes

- GitHub delivery guide is present.
- Changelog is present.
- Security policy is present.
- Package manifest is present.
- Final release audit is present.
- Repository remains private unless MD approves a visibility change.
- Public release remains gated by final license, pricing, support, and buyer-access approval.

## Phase 8 Marketplace Launch Notes

- private sales listing copy is present.
- Buyer FAQ is present.
- Launch post and marketplace image text guidance are present.
- Marketplace launch checklist is present.
- private sales product requirements are covered: title, pain point, practical package, setup, examples, troubleshooting references, sales copy, pricing justification, FAQ, and release checklist.
- Public sale remains gated by MD approval of license, price, refund policy, support scope, buyer access, repository visibility, and final product page.

## Phase 9 Buyer Fulfillment Notes

- Buyer fulfillment checklist is present.
- Post-purchase email templates are present.
- Support policy draft is present.
- Buyer first-run verification requirements are documented.
- Delivery remains gated by MD approval of buyer identity, license, payment confirmation, refund policy, support scope, delivery channel, and repository/download access method.

## Phase 10 Commercial Decision Gate Notes

- Pricing packages are documented for approval.
- Commercial terms draft is documented for approval.
- Commercial decision record is present.
- Buyer access SOP is present.
- Recommended defaults are documented: EUR 5,000 Builder License, EUR 10,000 Commercial Launch License, EUR 20,000 Enterprise / Investor-Grade Package, single-project commercial source-code license, private GitHub delivery, setup clarification support, and limited digital-product refund policy.
- Public sale and buyer access remain blocked until MD approval is recorded.

## Phase 11 Product Image Asset Notes

- Marketplace product cover image is present at `assets/marketplace/zebepay-product-cover.png`.
- README displays the product image.
- private sales listing references the product image.
- Launch assets identify the image as the primary marketplace/GitHub/sales-page image.
- Image avoids bank logos, official seals, direct payment-rail claims, and regulated-approval claims.

## Phase 12 Buyer Deal Room Notes

- Root proprietary commercial source license notice is present.
- Paystack differentiation brief is present.
- Buyer deal-room flow is present.
- Buyer-facing pricing is aligned to EUR 5,000 / EUR 10,000 / EUR 20,000.
- Code-review access is positioned as controlled evaluation only until license and payment are accepted.
- Public sale, repository visibility, and buyer access remain gated by MD approval per deal.

## Phase 13 Commercial Product Integrity Audit Notes

- Product positioning is corrected to Nigerian banking and wallet infrastructure foundation.
- Buyer-facing wording no longer presents the package as a licensed live payment gateway.
- Current ledger implementation is described as a ledger posting model, not a completed production double-entry engine.
- Production double-entry, provider integrations, regulated licensing, durable storage, reconciliation, and security review are listed as buyer hardening requirements.
- Phase 13 audit file is present.
- Commercial status remains controlled buyer review only until MD approves public sale and buyer access.

## Phase 22 Release Hardening And Buyer Handoff Notes

- `.env.example` lists the full PostgreSQL production gate, including transfer writes, admin writes, auth/session confirmation, audit writes, critical writes, and migration confirmation.
- Setup, deployment, troubleshooting, and buyer handoff docs describe the current PostgreSQL validation path.
- Buyer handoff includes first-operator verification, PostgreSQL smoke validation, readiness endpoint checks, and rollback guidance.
- Package manifest and README index include Phase 22.
- Final release audit records the Phase 22 cleanup and verification pass.
- Commercial status remains controlled buyer review only until MD approves license terms, sale channel, buyer access, refund policy, support scope, repository visibility, and regulated-production caveats.

## Phase 23 GitHub Commercial Packaging Notes

- Phase 23 evidence note is present.
- GitHub release body is present at `release/GITHUB_RELEASE_BODY.md`.
- GitHub repository checklist is present at `release/GITHUB_REPOSITORY_CHECKLIST.md`.
- Pull request template and CI workflow are present under `.github/`.
- controlled sales conversion pack is present at `sales/CONTROLLED_SALES_CONVERSION_PACK.md`.
- Package metadata points to the intended GitHub repository.
- Repository remains GitHub-ready for private delivery; release tagging, public
  visibility, buyer ZIP attachment, and buyer access remain gated by MD
  approval.

## Phase 25 Private GitHub Delivery Notes

- Phase 25 delivery note is present.
- Zebepay is classified as a closed commercial source-code product, not an
  open-source project.
- New private GitHub repository target is `ejikezebedee/zebepay`.
- Unrelated and legacy repositories are not delivery repositories for Zebepay.
- Sales-channel wording is generic controlled/private sales language only.
