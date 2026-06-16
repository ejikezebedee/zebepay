# Phase 25 - Private GitHub Delivery

Date: 2026-06-16

## Objective

Finalize the GitHub delivery decision for Zebepay after the product identity
cleanup.

## Decision

Zebepay will be delivered through a new private GitHub repository:

```text
https://github.com/ejikezebedee/zebepay
```

Zebepay is not an open-source release. It is a closed commercial source-code
product prepared for controlled sale and buyer access.

## Repository Separation

- `zebepay` is the active commercial product repository.
- AgentPay remains historical/internal context only.
- OpenBank remains historical/interim context only.
- Zebepay source must not be pushed into AgentPay or OpenBank repositories.

## Sales Channel Direction

The release package now uses generic controlled sales and private buyer access
language. No specific marketplace is treated as the operating focus unless MD
approves it separately.

## GitHub Push Plan

1. Create `ejikezebedee/zebepay` as a private GitHub repository.
2. Set local `origin` to `https://github.com/ejikezebedee/zebepay.git`.
3. Push `main` to the private repository.
4. Keep repository visibility private.
5. Add buyers only after payment, license acceptance, support-scope approval,
   and MD-approved delivery record.

## Release Gate

Do not make Zebepay public, publish it as open source, invite unpaid buyers, or
attach commercial release artifacts publicly without MD approval.
