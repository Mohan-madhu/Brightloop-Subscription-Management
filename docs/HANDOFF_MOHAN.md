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

## Final integration verification

PASS: sales acceptance now returns the existing linked subscription on a repeat request and lifecycle close transitions to `CLOSED` instead of the previously incorrect pause state. PASS: invalid lifecycle sources return `INVALID_TRANSITION`. PASS: auth activation/reset and staff activation emails use Vijay's shared transactional outbox payload. NOT RUN: complete Admin-to-payment dashboard demo, because Basim/Najid frontend modules are not present in this integrated checkout.

## Verification

PASS: Prisma validate/generate, migration deployment/status, repeatable baseline seed, live readiness/public lookup checks, Node syntax checks for auth/catalog/customer/sales modules, frontend TypeScript check, and production compilation/static-page generation.

FAIL: ESLint cannot load `es-abstract/2024/AddEntriesFromIterable` from the current local `eslint-plugin-react` dependency tree; this is an existing package-install/configuration issue, not an application lint result. `next build` completes compilation and static generation but reports the same lint-plugin failure.

NOT RUN: an authenticated browser success path requires a deliberately provisioned Admin account; no default-password account was created. Isolated destructive test DB checks for duplicate email, cross-customer ownership, invalid transitions and repeated acceptance are not available in this checkout and were not run against the shared database.

## Remaining scope and blockers

Quotation-template and staff-management endpoints are still pending. Invoice/billing/payment/report code is not implemented here. The known global tax/discount and variant-foreign-key schema gaps remain unresolved and must be approved before those capabilities are added. Sales routes do not automatically select taxes or discounts until their applicability target semantics are approved.

## October 31, 2026 integration pass

- PASS: `main` deployed to the VPS; web and API PM2 processes are online.
- PASS: VPS readiness, public company lookup and billing-interval lookup return HTTP 200.
- PASS: unauthenticated login returns 401; protected customer, invoice and staff routes return 401.
- PASS: unsigned Razorpay webhook request is rejected with HTTP 400.
- PASS: `SHOW_ERROR_DETAILS=false` is configured on the VPS.
- PASS: web typecheck and production compilation; ESLint now runs through the workspace-safe TypeScript parser (two existing unused-variable warnings remain).
- NOT RUN: live signup activation email and password-reset email, because no disposable production fixture address was authorized.
- NOT RUN: billing-twice duplicate-invoice check and Razorpay order/payment capture, because these mutate live financial data and require an isolated demo fixture/provider callback.

The current schema/API has no approved WhatsApp, IVR, SMS or push-notification provider contract, credentials, or persistence model. Vijay's alternate reminder backend was not merged; its UI must remain unconnected until those interfaces are approved.
