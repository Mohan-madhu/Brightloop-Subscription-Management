# Mohan backend handoff

## Implemented

- Migrations: initial foundation and `20261031000100_add_sessions`, both applied to the configured Brightloop database.
- Auth: signup, activation, login, logout, current-user, reset request/confirm; Argon2id, hashed expiring tokens, opaque hashed sessions, CSRF cookies, rate limiting and session revocation after reset.
- Catalog: product, variant, plan, tax and schema-supported discount reads/writes. Product and plan updates archive through `active=false`; no destructive endpoint is exposed.
- Customer: scoped lists/details and Admin assignment management.
- Sales: quotation creation/detail, transactional quotation acceptance to a subscription, subscription detail and lifecycle actions with status logs.

## Routes

See `IMPLEMENTATION_CONTRACT.md` for paths, roles, request fields, and shared interfaces. Routers register in `apps/api/src/app.js`; use `prisma` from `src/db/prisma.js` and guards from `src/middleware/auth.js`.

## Environment

`DATABASE_URL`, `WEB_ORIGIN`, and `AUTH_TOKEN_SECRET` are required for the API. Local jobs and email delivery remain disabled. Auth creates `EmailOutbox` records but no delivery worker is implemented here; Vijay owns transport.

## Verification

Passed: Prisma validate/generate, migration deployment/status, repeatable baseline seed, live readiness/public lookup checks, and Node syntax checks for auth/catalog/customer/sales modules.

Unverified: an authenticated browser success path requires a deliberately provisioned Admin account; no default-password account was created. Isolated destructive test DB checks for duplicate email, cross-customer ownership, invalid transitions and repeated acceptance are not available in this checkout and were not run against the shared database.

## Remaining scope and blockers

Quotation-template and staff-management endpoints are still pending. Quotation totals deliberately return no calculated amount until Vijay provides `calculateQuotationTotals`; invoice/billing/payment/report code is not implemented here. The known global tax/discount and variant-foreign-key schema gaps remain unresolved and must be approved before those capabilities are added.
