# Zebepay Brand Governance

## Current Product Identity

The active commercial product name is Zebepay.

Use Zebepay for:

- GitHub repository name
- Package name
- NPM workspace scope
- App titles
- API service name
- Buyer-facing documentation
- private sales and marketplace copy
- Support and release material
- Environment-variable prefix

## Technical Naming Standard

Use these names in code and documentation:

```text
Product name: Zebepay
Repository slug: zebepay
NPM workspace scope: @zebepay
Environment prefix: ZEBEPAY_
Primary repository URL: https://github.com/ejikezebedee/zebepay
```

## Legacy Names

AgentPay was an earlier working name used during the Zebepay marketplace and
backend-service build history. OpenBank NG was a separate interim package name
used during the Nigerian banking and wallet infrastructure hardening phases.

These names must not appear in buyer-facing product, setup, release, sales, or
GitHub material except in internal historical notes approved by MD.

## Separation Rule

Zebepay is the only live commercial identity for this package.

Legacy names are not brands, repositories, support channels, package scopes, or
buyer-facing product names for this release.

## Release Gate

Before each GitHub, private sales, or buyer package release, run a naming audit for:

```text
OpenBank
openbank
OPENBANK
AgentPay
Agentpay
agentpay
AGENTPAY
```

Expected result: zero matches in buyer-facing project files, except this
brand-governance note if MD keeps the historical reference.
