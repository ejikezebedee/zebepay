# Zebepay Post-Purchase Email Templates

## Buyer Access Email

Subject: Zebepay access and setup instructions

Hello,

Thank you for purchasing Zebepay.

Your package includes the Zebepay source-code platform, setup documentation, API reference, deployment guide, troubleshooting guide, buyer handoff notes, security policy, release checklist, and package manifest.

Start here:

1. Read `README.md`.
2. Follow `docs/SETUP_GUIDE.md`.
3. Review `docs/API_REFERENCE.md`.
4. Review `SECURITY.md`.
5. Review `release/RELEASE_CHECKLIST.md`.

Important: Zebepay is source-code software only. It is not a licensed bank, regulated payment processor, legal opinion, compliance certification, production security certification, or live payment-rail authorization. You are responsible for licensing, regulated providers, KYC/AML provider setup, legal/compliance review, production security audit, hosting, and go-live approval.

Regards,
Zebepay Delivery Team

## Buyer First-Run Follow-Up

Subject: Zebepay first-run checklist

Hello,

Please confirm these first-run checks:

- `npm install --include=dev` completed.
- `npm run build` passed.
- `npm test` passed.
- `.env.example` was copied into your local `.env`.
- Customer app, admin app, and API were reviewed locally.

If anything fails, send the command used, the error output, your Node.js version, and which app or service failed.

Regards,
Zebepay Delivery Team

## Support Boundary Response

Subject: Zebepay support scope

Hello,

Thanks for the update.

The included support scope covers package access, setup documentation clarification, first-run troubleshooting, and guidance on where to customize the code.

The included support scope does not cover regulated provider approval, production legal/compliance review, production security certification, custom feature development, infrastructure management, or live payment-rail operations unless a separate paid customization or support agreement is approved.

Regards,
Zebepay Delivery Team

## Refund Policy Response

Subject: Zebepay refund request

Hello,

Thank you for contacting us.

Zebepay is a digital source-code package. Refund eligibility is limited to duplicate purchases, incorrect file delivery, or download/access issues that cannot be resolved.

Refunds do not cover buyer misunderstanding of licensing, regulated provider requirements, production readiness obligations, or custom implementation work when these conditions were stated before purchase.

We will review the request and respond with the final decision under the approved refund policy.

Regards,
Zebepay Delivery Team
