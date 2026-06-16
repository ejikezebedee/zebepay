# Pull Request Checklist

## Scope

- [ ] Change is limited to the stated product/release scope.
- [ ] Runtime behavior changes include tests or documented verification.
- [ ] Buyer-facing docs are updated when setup, behavior, or release status
  changes.

## Commercial Safety

- [ ] No private keys, tokens, production secrets, real customer data, or private
  banking credentials are included.
- [ ] No internal workspace paths, machine-specific home paths, local logs, or
  `.env` files are included.
- [ ] No claim presents Zebepay as a licensed bank, regulated payment
  processor, legal advice, compliance certification, production security
  certification, or managed production service.

## Verification

- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] Optional: `npm run smoke:postgres`

## Notes

Describe buyer-visible impact, release impact, and any remaining approval items.
