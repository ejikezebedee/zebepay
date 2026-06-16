# Zebepay Product Blueprint

## Title

Zebepay - Nigerian Banking & Wallet Infrastructure Foundation

## Product Category

Commercial fintech source-code platform.

## Target Buyers

- Nigerian fintech founders
- Software agencies building fintech products for clients
- Cooperatives and savings organizations
- Licensed financial operators
- Developer teams building wallet, neobank, agency banking, or payment products
- Training programs teaching real fintech architecture

## Buyer Pain Point

Building a Nigerian fintech/banking product from scratch is slow, expensive, and risky. Most templates only provide UI screens or shallow transaction demos. Buyers need a full architecture foundation with a real ledger model, admin operations, Nigerian banking assumptions, provider adapters, and documentation.

## Promise

Zebepay gives buyers a serious banking and wallet infrastructure foundation
they can customize, audit, demonstrate, and connect to their own licensed
partners.

## Core Product Modules

### Customer App

- Secure sign-up and login
- PIN/password authentication
- Account overview
- Wallet balance
- Transaction history
- Transfers
- Funding requests
- Withdrawal requests
- Beneficiary management
- KYC profile
- Receipts
- Support and disputes
- Notifications
- Settings and device/session view

### Admin App

- Operations dashboard
- User management
- KYC review
- Wallet/account monitoring
- Transaction monitoring
- Transfer review
- Funding and withdrawal review
- Disputes and reversals
- Fees and limits management
- Provider event log
- Audit trail
- Staff roles and permissions
- Reconciliation workspace

### Backend API

- Authentication and sessions
- User profiles
- KYC workflow
- Wallet/account service
- Ledger posting model with a production double-entry hardening path
- Transfer orchestration
- Funding orchestration
- Withdrawal orchestration
- Provider integration layer
- Webhook ingestion
- Idempotency controls
- Admin authorization
- Audit logging
- Reporting endpoints

### Shared Package

- Nigerian bank constants
- Currency helpers
- Transaction status types
- KYC tier types
- API schemas
- Validation rules

## Nigerian Banking Features

- NGN stored as integer kobo
- Nigerian phone-number normalization
- Nigerian bank directory and bank codes
- NUBAN-style account-number generation support
- BVN/NIN-ready KYC fields
- KYC tier limits
- NIP/NIBSS-style transaction lifecycle
- Provider adapter architecture for licensed rails

## Product Boundaries

Zebepay is software only. It does not include a banking license, live
payment processing authorization, production KYC/AML approval, direct NIBSS
access, legal advice, compliance certification, or a production-ready regulated
ledger.

## Commercial Deliverables

- Source code
- Setup guide
- Environment-variable guide
- API documentation
- Demo data
- Admin workflow guide
- Buyer compliance checklist
- Provider integration guide
- Troubleshooting guide
- Sales page copy
- Pricing rationale
- Release checklist

## Quality Bar

Zebepay must feel closer to a serious banking platform than a demo:

- No fake balance logic in production paths
- No float money handling
- No uncontrolled status randomness
- No hardcoded secrets
- No internal workspace paths in buyer-facing docs
- No bank brand imitation
- No GTBank or Standard Chartered assets
- Clear warnings where real regulated providers are required
