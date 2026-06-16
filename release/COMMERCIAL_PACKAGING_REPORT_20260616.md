# Zebepay Commercial Packaging Report - 2026-06-16

## Repository Visibility

- Repository: `ejikezebedee/zebepay`
- Required commercial model: private source-code repository with controlled buyer access.
- Verified state: private.
- Default branch: `main`.

## Package

- Buyer package: `release/zebepay-v0.1.0-commercial-buyer-package-20260616.zip`
- SHA256 file: `release/zebepay-v0.1.0-commercial-buyer-package-20260616.zip.sha256`
- SHA256: see the external `.sha256` file generated after packaging.

## Included Summary

The buyer package includes:

- `apps/`
- `services/`
- `packages/`
- `docs/`
- `sales/`
- `release/`
- `.github/`
- `README.md`
- `LICENSE`
- `SECURITY.md`
- `SUPPORT.md`
- `CHANGELOG.md`
- `package.json`
- `package-lock.json`
- `.env.example`
- `BUYER_PRODUCTION_WARNING.md`
- `BUYER_EVALUATION_AGREEMENT.md`

## Excluded Summary

The package excludes:

- `.git/`
- `node_modules/`
- `.next/`
- `dist/`
- `build/`
- `coverage/`
- `.env`
- `.env.local`
- `*.log`
- `*.pid`
- `.runtime/`
- `runtime/`
- `tmp/`
- `.cache/`
- `.DS_Store`
- TypeScript build cache files.
- Generated buyer ZIP and checksum files.

## Verification Results

- `npm install --include=dev`: passed.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm test`: passed with 39 passing tests and 1 skipped PostgreSQL integration smoke.
- `npm audit --audit-level=moderate`: returned 2 moderate advisories.

## Dependency Advisories

`npm audit` reports a moderate PostCSS advisory through Next.js. The available
fix requires `npm audit fix --force` and would install a breaking Next.js
version. This was not forced. Record as a dependency-hardening item for the
next paid hardening pass.

## Buyer-Facing Caveats

Zebepay is a private commercial source-code foundation only. It is not a
licensed bank, CBN-approved operator, NIBSS-connected provider, legal opinion,
compliance certification, production security certification, or live regulated
payment processor.

Before live regulated use, the buyer must complete licensing review, provider
onboarding, KYC/AML integration, password/session hardening, webhook signature
verification, security audit, legal review, infrastructure hardening,
monitoring, and incident-response setup.

## Remaining Hardening Risks

- Replace sandbox SHA-256 password hashing with Argon2id or bcrypt.
- Replace sandbox session token system with a real JWT/access-refresh session model.
- Add rate limiting.
- Add webhook signature verification.
- Add secret manager guidance.
- Add production logging and monitoring guidance.
- Resolve or document Next.js/PostCSS advisories.
- Add CodeQL.
- Add GitHub secret scanning instructions.
- Add dependency review workflow.
- Add database migration verification script.

## Next Commercial Step

Create a separate public marketing wrapper repository with buyer-safe
screenshots, product summary, FAQ, pricing teaser, and contact instructions.
Keep the full `zebepay` source repository private and grant buyer access only
after MD approval, payment or evaluation approval, license acceptance, and
support-scope approval.
