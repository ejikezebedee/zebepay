# Zebepay v0.1.0 Buyer-Ready Release

## Release Summary

Zebepay is a commercial Nigerian banking and wallet infrastructure
foundation for controlled buyer review. It includes a customer app, admin
operations dashboard, backend API, shared banking package, PostgreSQL schema,
Nigerian banking domain primitives, setup documentation, sales material, and
release audit notes.

This release is intended for private GitHub delivery only until MD approves
public sale, repository visibility, license terms, buyer access, refund policy,
and support scope.

## What Is Included

- Customer banking web app.
- Admin operations dashboard.
- Backend API service.
- Shared banking domain package.
- PostgreSQL-compatible schema and migration notes.
- Ledger posting model with reversal support and production double-entry
  hardening path.
- Customer auth, admin auth, session signing, OTP, trusted-device, transfer
  risk, admin review, audit, notification, funding-intent, payout-dispatch, and
  reconciliation workflow surfaces.
- Setup, deployment, API, troubleshooting, buyer handoff, security, sales, and
  release documentation.
- GitHub buyer support routing with issue templates.
- private buyer conversion copy and commercial package documentation.

## Verification Commands

Run from the repository root:

```bash
npm install --include=dev
npm run build
npm run lint
npm test
```

Optional PostgreSQL smoke validation:

```bash
npm run smoke:postgres
```

The PostgreSQL smoke check requires a configured `DATABASE_URL`, applied
migrations, and the production readiness flags described in `.env.example` and
`docs/SETUP_GUIDE.md`.

## Buyer Review Path

1. Read `README.md`.
2. Confirm package contents in `release/PACKAGE_MANIFEST.md`.
3. Follow local setup in `docs/SETUP_GUIDE.md`.
4. Review production boundaries in `docs/DEPLOYMENT_GUIDE.md` and `SECURITY.md`.
5. Review commercial terms drafts in `sales/` and `docs/LICENSE_TERMS_DRAFT.md`.
6. Confirm remaining approval items in `release/FINAL_RELEASE_AUDIT.md`.

## Commercial Boundary

Zebepay is source-code software only. It does not include a banking license,
direct NIBSS access, regulated payment processing rights, production KYC/AML
approval, legal advice, compliance certification, production security
certification, or managed production operations.

## Release Gate

Do not publish publicly, invite buyers, tag a public release, attach private
buyer ZIP files, or grant repository access until MD approves:

- final license terms,
- final sale channel,
- buyer access process,
- refund policy,
- support scope,
- repository visibility,
- regulated-production caveats.
