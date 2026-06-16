# Zebepay Commercial Release Checklist

## Repository And Access

- [ ] Full source-code repository is private.
- [ ] Public wrapper repository contains marketing material only.
- [ ] Buyer access period approved.
- [ ] Buyer identity verified.
- [ ] Payment or evaluation approval recorded.
- [ ] Buyer license acceptance recorded.
- [ ] Support scope approved.

## Commercial Documents

- [ ] LICENSE confirms proprietary commercial source-code license.
- [ ] README has private commercial sale positioning.
- [ ] README has compliance boundary.
- [ ] SECURITY.md has production warning.
- [ ] BUYER_PRODUCTION_WARNING.md included.
- [ ] BUYER_EVALUATION_AGREEMENT.md included.
- [ ] docs/BUYER_HANDOFF.md included.
- [ ] docs/PUBLIC_PRIVATE_PACKAGING_PLAN.md included.
- [ ] Final price approved.
- [ ] Refund policy approved.

## Cleanup And Safety

- [ ] No real secrets.
- [ ] No private tokens.
- [ ] No private keys.
- [ ] No `.env` or `.env.local` files.
- [ ] No private emails.
- [ ] No internal VPS paths.
- [ ] No local machine paths.
- [ ] No absolute home-directory paths.
- [ ] No local agent workspace paths.
- [ ] No `node_modules`.
- [ ] No build artifacts.
- [ ] No runtime logs.
- [ ] No generated caches.

## Buyer Package

- [ ] Buyer ZIP created.
- [ ] SHA256 checksum created.
- [ ] ZIP excludes `.git`.
- [ ] ZIP excludes dependency folders.
- [ ] ZIP excludes build outputs.
- [ ] ZIP excludes logs and runtime folders.
- [ ] ZIP excludes env files and secrets.
- [ ] ZIP includes setup, deployment, API, handoff, warning, license, and support files.

## Verification

- [ ] `npm install --include=dev` passed.
- [ ] `npm run build` passed.
- [ ] `npm run lint` passed.
- [ ] `npm test` passed.
- [ ] `npm run smoke:postgres` reviewed or run where PostgreSQL is available.
- [ ] `npm audit --audit-level=moderate` reviewed.

## Hardening Items Before Premium Sale

- [ ] Replace sandbox SHA-256 password hashing with Argon2id or bcrypt.
- [ ] Replace sandbox session token system with real JWT/access-refresh session model.
- [ ] Add rate limiting.
- [ ] Add webhook signature verification.
- [ ] Add secret manager guidance.
- [ ] Add production logging and monitoring guidance.
- [ ] Resolve or document Next.js/PostCSS advisories.
- [ ] Add CodeQL workflow.
- [ ] Add GitHub secret scanning instructions.
- [ ] Add dependency review workflow.
- [ ] Add database migration verification script.
