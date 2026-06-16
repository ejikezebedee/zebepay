# Zebepay Buyer FAQ

## Is Zebepay a licensed bank?

No. Zebepay is software source code only. The buyer must provide all required licenses, regulated partners, legal review, compliance approval, and payment-rail authorization.

## Can I use it for a client project?

Yes, subject to the final commercial license selected before sale. Agencies should confirm whether the purchased license permits one client project, multiple client projects, resale, or white-label delivery.

## Can I deploy it to production immediately?

No. Before production use, the buyer must complete provider integrations, production authentication, password/PIN hashing, database repository wiring, webhook verification, monitoring, security audit, legal review, compliance approval, and regulated partner approval.

## Does it include real NIBSS access?

No. It includes Nigerian banking workflow assumptions and provider adapter boundaries. The buyer must connect approved providers and payment rails.

## Does it include BVN or NIN verification?

It includes BVN/NIN-ready fields and KYC workflow structure. The buyer must connect licensed KYC/identity providers before live verification.

## What technical stack does it use?

The package uses a TypeScript monorepo with customer web, admin web, API service, shared banking package, and PostgreSQL-compatible schema documentation.

## What should I review first?

Start with `README.md`, `docs/SETUP_GUIDE.md`, `docs/API_REFERENCE.md`, `docs/DEPLOYMENT_GUIDE.md`, `SECURITY.md`, and `release/RELEASE_CHECKLIST.md`.

## Why would I buy this instead of using Paystack?

Use Paystack if you only need hosted payment acceptance. Buy Zebepay if you
want to own and customize a fintech platform foundation with customer/admin
apps, backend API, wallet/account workflow, ledger boundaries, KYC structure,
provider adapter architecture, reconciliation support, and audit controls.

Zebepay can be connected to approved providers, including Paystack, after
the buyer completes the required provider, compliance, security, and legal work.

## What is the biggest buyer benefit?

The buyer starts with a structured fintech foundation that includes app surfaces, backend workflow boundaries, Nigerian banking primitives, and buyer-facing documentation.

## Can I examine the code before buying?

Qualified buyers may receive controlled evaluation access through a private
GitHub invitation or sanitized source archive preview. Evaluation access allows
inspection only. Copying, redistribution, production deployment, or commercial
use requires an accepted commercial license.

## What is not included?

Zebepay does not include legal advice, banking license, production KYC/AML approval, live payment provider contracts, production security certification, hosted infrastructure, or guaranteed regulatory acceptance.

## What customization is expected?

Expected customization includes branding, production auth, PostgreSQL repository wiring, provider integrations, webhook signature checks, observability, support operations, compliance workflows, and deployment hardening.
