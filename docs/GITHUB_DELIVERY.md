# GitHub Delivery Guide

## Repository

```text
https://github.com/ejikezebedee/zebepay
```

Current delivery branch:

```text
main
```

## Delivery Status

Zebepay is a closed commercial source-code product prepared for private GitHub
delivery. It is not an open-source project.

Phase 25 GitHub status: create or use the private repository
`ejikezebedee/zebepay`, set the local `origin` remote to that repository, and
push the cleaned Zebepay source there. Do not push Zebepay into any unrelated
or legacy repository.

## Required GitHub Settings Before Buyer Delivery

- Keep repository private.
- Add final license file when MD selects the commercial license.
- Add repository description:
  - `Fullstack Nigerian banking and wallet source-code platform.`
- Add topics:
  - `fintech`
  - `nigeria`
  - `banking`
  - `wallet`
  - `nextjs`
  - `nodejs`
  - `postgresql`
- Keep issues restricted until support policy is finalized, or use issue templates.
- Use `SUPPORT.md` and the included issue templates for buyer contact after
  support scope is approved.
- Use `.github/pull_request_template.md` for collaborator changes.
- Use `.github/workflows/ci.yml` for build, lint, and test verification after
  push.
- Protect `main` before adding external collaborators.
- Require pull request review before merge if a team starts contributing.

## Buyer Review Flow

1. Qualify the buyer by company, use case, budget, and intended deployment.
2. Confirm they understand Zebepay is source-code software only, not a
   licensed payment operator.
3. Share repository access with the approved buyer or reviewer only.
4. Direct them to `README.md`.
5. Direct technical reviewers to `docs/SETUP_GUIDE.md` and `docs/API_REFERENCE.md`.
6. Direct commercial reviewers to `sales/SALES_PAGE_COPY.md`,
   `docs/PAYSTACK_DIFFERENTIATION.md`, `sales/DEAL_ROOM.md`, and
   `docs/BUYER_HANDOFF.md`.
7. Direct security reviewers to `SECURITY.md`, `docs/DEPLOYMENT_GUIDE.md`, and
   `release/FINAL_RELEASE_AUDIT.md`.
8. Direct buyer contact and setup questions to `SUPPORT.md`.
9. Remove evaluation access if the buyer does not proceed or breaches review
   terms.

## Release Tag Plan

Suggested tag after final approval:

```text
v0.1.0-buyer-ready
```

Suggested release title:

```text
Zebepay v0.1.0 Buyer-Ready Release
```

## Release Description

Use `release/GITHUB_RELEASE_BODY.md` as the release description source.

## Do Not Publish Before

- MD approval.
- Final license selection.
- Final price confirmation.
- Final buyer support scope.
- Final repository visibility decision.
