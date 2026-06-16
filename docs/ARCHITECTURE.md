# Zebepay Architecture

## Architecture Goal

Zebepay is a Nigerian banking and wallet infrastructure foundation built as
a commercial source-code product. The architecture separates customer
experience, admin operations, banking domain logic, provider adapters, and
shared validation.

## Recommended Stack

- Customer app: React/Next.js PWA
- Admin app: React/Next.js dashboard
- API service: Node.js/NestJS or FastAPI
- Database: PostgreSQL
- ORM: Prisma or SQLAlchemy
- Cache/queue: Redis-ready adapter
- Auth: JWT sessions with refresh-token rotation
- Money storage: integer kobo
- Deployment: Docker-ready local and cloud setup

The implementation can support equivalent stacks, but buyer-facing documentation must stay portable.

## Main Domains

### Identity And Access

- Customer registration
- Staff registration by admin
- Password and PIN hashing
- Refresh-token rotation
- Device/session tracking
- Role-based access control
- Failed login and PIN lockout
- Admin privilege separation

### Customer Profile And KYC

- Personal profile
- Address
- BVN/NIN-ready fields
- Identity-document metadata
- KYC tier
- KYC status
- Admin review trail
- Provider verification adapter hooks

### Wallet And Account

- Wallet ownership
- Account number assignment
- Ledger account linkage
- Available and pending balance views
- Balance derived from ledger entries, not manually trusted totals

### Ledger

The ledger is the heart of the financial workflow. The current implementation
posts customer account ledger entries, balance-after values, idempotent
transfer records, and reversal entries. A production buyer should harden this
into a true double-entry accounting engine before live regulated use.

Rules:

- Every financial event must be traceable to immutable ledger entries.
- Production double-entry posting must balance customer, settlement, fee,
  pending, and clearing accounts.
- Money amounts are stored as integer kobo.
- Ledger entries are immutable after posting.
- Corrections use reversal entries.
- Transaction references are unique.
- Idempotency keys are enforced on externally triggered events.

Core ledger accounts:

- Customer wallet liability
- Platform settlement asset
- Fees revenue
- Pending inbound settlement
- Pending outbound settlement
- Reversal clearing

### Transactions

Supported transaction types:

- Internal transfer
- Bank transfer request
- Inbound funding
- Withdrawal request
- Fee charge
- Reversal
- Refund
- Adjustment

Statuses:

- draft
- pending
- processing
- requires_review
- successful
- failed
- reversed
- cancelled

Transfer security controls:

- Trusted customer-device context.
- OTP challenge verification before sensitive money movement.
- Risk scoring based on device, OTP, KYC tier, and repeated similar transfers.
- Manual review queue for high-risk transfers.
- Release and rejection workflow with audit and notification records.

### Provider Adapters

Provider integrations must be replaceable.

Adapter categories:

- Bank directory
- Account lookup
- Inbound funding
- Bank transfer payout
- KYC verification
- SMS/email notification
- Card/virtual account provider

Initial provider targets:

- Sandbox provider
- Paystack-style funding adapter
- Monnify-style virtual account adapter
- Flutterwave-style payout adapter
- Bank-sponsor/NIBSS-connected processor adapter

### Admin Operations

Admin users can:

- Review customers
- Approve or reject KYC
- Monitor transactions
- Investigate stuck transfers
- Trigger safe reversals
- View provider webhook events
- Export reconciliation reports
- Manage fees and limits
- Handle support disputes
- Release or reject security-held transfers
- Review audit logs

### Audit And Compliance

Audit logs are required for:

- Login events
- Admin actions
- KYC decisions
- Transaction state changes
- Ledger posting
- Provider webhook ingestion
- Fee/limit changes
- Support/dispute actions

## Security Baseline

- No hardcoded secrets
- Environment variables only
- Passwords and PINs hashed
- Sensitive identity fields encrypted or tokenized in production
- Rate limits on auth and transaction routes
- Idempotency on money-moving endpoints
- Webhook signature verification
- Input validation at API boundary
- Strict CORS configuration for production
- Staff role separation
- Device trust, OTP verification, and risk holds on sensitive transfer actions

## Completion Definition

The product is buyer-review ready when the customer app, admin app, backend API,
database schema, docs, demo data, tests, and release audit all exist and pass the
commercial checklist. It is not live-production ready until licensed providers,
real auth, durable storage, production double-entry ledger enforcement,
reconciliation, security review, and regulatory approvals are completed by the
buyer.
