# Nigeria Banking Model

## Purpose

This document defines the Nigerian banking assumptions used by Zebepay.

## Money Model

- Currency: NGN
- Storage unit: kobo
- Data type: integer
- Display format: naira with two decimals

Never store balances or transaction amounts as floating-point numbers.

## Customer Identity

Supported identity fields:

- First name
- Last name
- Phone number
- Email
- Date of birth
- Address
- BVN-ready field
- NIN-ready field
- Identity-document metadata
- KYC tier
- KYC status

Production deployments should encrypt or tokenize sensitive identity fields and connect approved KYC providers.

## KYC Tiers

Suggested buyer-configurable tiers:

- Tier 0: registered, unverified
- Tier 1: phone/email verified
- Tier 2: BVN/NIN reviewed
- Tier 3: enhanced verification

Each tier should control:

- Max single transaction
- Daily transaction limit
- Monthly transaction limit
- Allowed channels
- Funding and withdrawal permissions

## Account Numbers

Zebepay supports NUBAN-style account-number generation logic for demo/sandbox accounts.

Production deployments must use buyer-approved account-number issuance rules from their sponsoring bank, virtual-account provider, or licensed infrastructure provider.

## Bank Directory

The platform should maintain:

- Bank name
- Bank code
- Slug
- Active/inactive state
- Provider-specific mapping

Bank list updates should be configurable because provider codes can differ.

## Transfer Lifecycle

Nigerian transfer rails commonly require robust status handling. Zebepay uses this lifecycle:

- created
- queued
- provider_submitted
- pending_provider_confirmation
- successful
- failed
- reversed
- requires_manual_review

The customer-facing view should simplify this to:

- Pending
- Successful
- Failed
- Reversed

## Provider Integration Boundary

Zebepay should include adapters, not hardcoded provider dependency.

Adapters should support:

- Account name lookup
- Transfer initiation
- Transfer status query
- Funding webhook verification
- Virtual account assignment
- Reversal notification
- Provider incident logging

## Reconciliation

Admin reconciliation should compare:

- Internal ledger entries
- Provider transaction references
- Settlement reports
- Bank statement exports
- Webhook event logs

Unmatched records should be visible in the admin dashboard.

## Buyer Compliance Checklist

Before live deployment, buyer must verify:

- Licensing or bank partnership
- CBN/payment-service requirements
- KYC/AML provider approval
- Data protection compliance
- Production security audit
- PCI scope if cards are involved
- Provider contracts
- Incident response process
- Customer support workflow
- Financial reconciliation process
