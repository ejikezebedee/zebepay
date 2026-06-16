# Zebepay Buyer Fulfillment Checklist

## Status

Status: fulfillment-ready draft, pending MD approval for final sale terms and buyer access process.

## Before Sending Buyer Access

- [ ] Payment confirmed.
- [ ] Buyer name or company recorded.
- [ ] Buyer email or delivery contact recorded.
- [ ] Purchased package/tier recorded.
- [ ] Final license terms attached or linked.
- [ ] Refund policy attached or linked.
- [ ] Support scope attached or linked.
- [ ] Repository or download access method selected.
- [ ] Buyer compliance notice included.
- [ ] Buyer understands this is source-code software only.

## Delivery Package

Send or provide access to:

- Source-code repository or packaged archive.
- `README.md`.
- `docs/SETUP_GUIDE.md`.
- `docs/API_REFERENCE.md`.
- `docs/DEPLOYMENT_GUIDE.md`.
- `docs/TROUBLESHOOTING.md`.
- `docs/BUYER_HANDOFF.md`.
- `SECURITY.md`.
- `release/PACKAGE_MANIFEST.md`.
- `release/RELEASE_CHECKLIST.md`.
- `sales/BUYER_FAQ.md`.

## Buyer First-Run Checklist

Ask the buyer to verify:

- Node.js 20+ is installed.
- Dependencies install with `npm install --include=dev`.
- Build passes with `npm run build`.
- Tests pass with `npm test`.
- `.env.example` has been copied into a local `.env`.
- Customer app, admin app, and API can be reviewed locally.

## Fulfillment Safety Gate

Do not grant public repository access, publish download files, or begin paid customization until MD approves the buyer, license, price, refund policy, support scope, and delivery channel.

## Completion Record

Record after delivery:

- Buyer:
- Package/tier:
- Delivery date:
- Delivery channel:
- License version:
- Support term:
- Notes:
