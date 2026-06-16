# Zebepay GitHub Repository Checklist

## Repository Destination

```text
https://github.com/ejikezebedee/zebepay
```

Recommended working branch for this package:

```text
phase-23-github-commercial-packaging
```

Recommended approved release tag:

```text
v0.1.0-buyer-ready
```

## Repository Settings

- [ ] Keep repository private until MD approves public visibility.
- [ ] Set repository description to
  `Fullstack Nigerian banking and wallet source-code platform.`
- [ ] Add topics: `fintech`, `nigeria`, `banking`, `wallet`, `nextjs`,
  `nodejs`, `postgresql`.
- [ ] Protect `main`.
- [ ] Require pull request review before merge when collaborators are added.
- [ ] Disable blank issues or keep the included issue-template routing.
- [ ] Route security concerns through `SECURITY.md`.
- [ ] Keep GitHub Actions enabled for package verification when pushed.

## Files Expected In GitHub

- [ ] `README.md`
- [ ] `LICENSE`
- [ ] `SECURITY.md`
- [ ] `SUPPORT.md`
- [ ] `.env.example`
- [ ] `.github/ISSUE_TEMPLATE/`
- [ ] `.github/pull_request_template.md`
- [ ] `.github/workflows/ci.yml`
- [ ] `apps/`
- [ ] `services/`
- [ ] `packages/`
- [ ] `db/`
- [ ] `docs/`
- [ ] `sales/`
- [ ] `release/`
- [ ] `assets/marketplace/`
- [ ] `artifacts/screenshots/`

## Pre-Push Verification

Run locally before pushing:

```bash
npm install --include=dev
npm run build
npm run lint
npm test
```

Optional PostgreSQL validation:

```bash
npm run smoke:postgres
```

## Cleanup Gate

Confirm the repository does not expose:

- private keys,
- API tokens,
- production secrets,
- real customer data,
- private banking credentials,
- private email addresses,
- internal workspace paths,
- machine-specific home paths,
- local runtime logs,
- dependency folders,
- build output,
- `.env` files.

## Buyer Access Gate

Before adding an external buyer or reviewer:

- [ ] Buyer identity or company confirmed.
- [ ] Use case confirmed.
- [ ] Budget or commercial fit confirmed.
- [ ] License terms accepted or ready for review.
- [ ] Payment or approved diligence stage confirmed.
- [ ] Support scope confirmed.
- [ ] Access duration and removal rules confirmed.

## Release Gate

Before creating a GitHub release:

- [ ] MD has approved release creation.
- [ ] Final license terms are approved.
- [ ] Final refund policy is approved.
- [ ] Final sale channel is approved.
- [ ] Final support scope is approved.
- [ ] Release body uses `release/GITHUB_RELEASE_BODY.md`.
- [ ] Release tag matches the approved package version.
- [ ] Private ZIP/hash attachment is approved if used.

## Status

GitHub-ready locally after verification. Push, public visibility, release tag,
release assets, marketplace publication, and buyer access require MD approval.
