# Zebepay Buyer Access SOP

## Status

Draft SOP for controlled buyer access. Requires MD approval before use.

## Access Method

Preferred method: private GitHub repository access.

Fallback method: packaged source archive through an approved marketplace or secure delivery channel.

## Access Steps

1. Confirm buyer identity or company.
2. Confirm buyer use case and intended deployment.
3. Confirm whether access is evaluation-only or post-payment delivery.
4. Confirm purchased package/tier if payment has already occurred.
5. Confirm license terms accepted.
6. Confirm refund policy accepted.
7. Confirm support scope accepted.
8. Send buyer access email from `sales/POST_PURCHASE_EMAILS.md`.
9. Grant private repository access or deliver approved package archive.
10. Record delivery in `release/BUYER_FULFILLMENT_CHECKLIST.md`.
11. Ask buyer to complete first-run verification.
12. Direct approved support questions to `SUPPORT.md` and the private
    repository `Buyer support request` issue template.

## GitHub Access Controls

- Grant the least access needed.
- Prefer read-only collaborator access where available.
- Remove access if payment is reversed, license is breached, or access was granted in error.
- Do not make the repository public unless MD approves public visibility.
- Keep blank issues disabled until MD approves public support scope.
- For pre-sale evaluation, make clear that access is inspection-only and does
  not grant copying, redistribution, production deployment, or commercial use.

## Archive Delivery Controls

- Exclude `node_modules/`, build outputs, local environment files, logs, and temporary files.
- Include `.env.example`, docs, release files, sales/support docs, apps, services, packages, and database files.
- Run the commercial cleanup scan before packaging.
- Verify the archive can be extracted and inspected before delivery.

## Buyer Support Intake

Ask buyers to include:

- Package/tier.
- Node.js version.
- Operating system.
- Command used.
- Error output.
- App or service affected.
- Whether dependencies were freshly installed.

## Stop Conditions

Stop access or escalation if:

- Buyer requests regulated financial advice.
- Buyer requests live payment operations without proper provider approval.
- Buyer asks to remove compliance or security warnings.
- Buyer requests resale of the original source-code package.
- Buyer requests production launch claims that the package does not support.
