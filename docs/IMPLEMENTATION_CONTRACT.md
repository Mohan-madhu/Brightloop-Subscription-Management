# Brightloop implementation contract

## Data and ownership

Mohan owns `apps/api/prisma/**`, `src/config`, `src/db`, `src/middleware`, auth, catalog, customer, quotation and subscription modules. Vijay owns invoices, `BillingPeriod` generation, `Invoice`/`Payment` writes, outbox delivery and reports. Frontend code calls Express only.

Core schema names are `User`, `AuthCredential`, `Role`, `UserRole`, `AuthToken`, `Customer`, `CustomerAssignment`, `Product`, `ProductVariant`, `Attribute`, `VariantAttributeValue`, `Plan`, `PlanProduct`, `Tax`, `Discount`, `QuotationTemplate`, `Quotation`, `Subscription`, `SubscriptionLine`, `SubscriptionStatusLog`, and `BillingPeriod`. Lifecycle enums are `QuoteStatus` and `SubscriptionStatus`. Decimal API values are strings.

## Shared backend interfaces

`src/db/prisma.js` exports the singleton `prisma`. `src/middleware/validate.js` exports `parsePagination`; `src/middleware/errors.js` exports `AppError`. `src/middleware/auth.js` exports `requireAuth`, `requireRole`, and `requireCustomerAccess`. Auth routers register in `src/app.js`.

Vijay exports `calculateQuotationTotals(input)` from `src/services/calculations.js` when implemented. Until then quotation writes return `CALCULATION_UNAVAILABLE` rather than calculate totals independently. Vijay owns subscription-to-billing consumption: use persisted `Subscription`, `SubscriptionLine`, `BillingPeriod`, and status logs; a subscription is billable only when `status=ACTIVE`.

The existing `EmailOutbox` is the transactional email interface: auth stores `{ type, token }` in `body` in the same transaction as a token row. Vijay’s delivery worker is the only sender.

## Auth and access

**PLANNED:** `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, and `GET /api/v1/auth/me` will use opaque random values stored hashed server-side and returned only as an HttpOnly `bl_session` cookie. Cookie settings are `SameSite=Lax`, `Secure` in production, and `Path=/`. Mutations require the allowed `WEB_ORIGIN`; cookie-auth mutations also require `X-CSRF-Token` matching the non-HttpOnly `bl_csrf` cookie. The existing bearer-token implementation will be replaced as part of the session migration.

**PLANNED:** `POST /auth/signup`, `POST /auth/activate`, `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`, and Admin-only `POST /staff`. Signup accepts `{email,firstName,lastName?,password}`; password is 9+ characters including upper, lower and special. Public payloads never contain roles. Reset request returns `{data:{accepted:true}}` whether an account exists. Errors are `VALIDATION_ERROR`, `AUTHENTICATION_REQUIRED`, `FORBIDDEN`, `INVALID_CREDENTIALS`, `CONFLICT`, and `RATE_LIMITED`.

## HTTP routes

All list routes accept `page`, `pageSize`, `search`, `sortBy`, and `sortOrder`; supported sort keys are declared per route. Responses and errors use `API_CONVENTIONS.md`.

| Status | Route | Role/access | Request/result |
|---|---|---|---|
| PLANNED | `GET /catalog/products` | authenticated | paginated products; Marketing/Customer read only |
| PLANNED | `POST/PATCH /catalog/products/:id?` | Admin | product fields, decimal prices as strings |
| PLANNED | `POST/PATCH /catalog/products/:id/variants/:variantId?` | Admin | `{sku?,priceAdjustment,attributes[]}` |
| PLANNED | `GET/POST/PATCH /catalog/plans` | authenticated/Admin write | plan and `products[]` with `isAddon`/price |
| IMPLEMENTED | `GET/POST/PATCH /catalog/taxes`, `/catalog/discounts` | authenticated/Admin write | configuration only; targets limited to schema-supported product/variant/plan |
| IMPLEMENTED | `GET /customers`, `GET /customers/:id` | Admin/Finance; Marketing assigned; Customer self | customer fields |
| IMPLEMENTED | `POST /customers/:id/assignments` | Admin | `{userId}` |
| PLANNED | `GET/POST/PATCH /quotation-templates` | authenticated/Admin write | template lines and terms |
| IMPLEMENTED | `POST/GET /quotations/:id` | Admin or assigned Marketing | quotation line records; totals await Vijay calculator |
| IMPLEMENTED | `POST /quotations/:id/accept` | Admin or assigned Marketing | transactionally creates linked subscription |
| IMPLEMENTED | `GET /subscriptions/:id`, `POST /subscriptions/:id/actions` | Admin/Finance, assigned Marketing, self Customer | explicit lifecycle action |

## Financial and date rules

Subscription-line agreed prices are the invoice input; plan base price appears once and product base price is never added a second time. Round decimal currency half-up to two places. Tax is tax-exclusive and applied after the selected discount. Proposed discount rule, pending approval: select the eligible rule with the greatest monetary reduction, then stable rule ID. Timestamps are UTC; calendar billing uses Asia/Kolkata and preserves the subscription anchor. Cancellation with recorded payments is rejected; refunds are out of scope.

## Unresolved constraints

The current schema does not enforce global tax applicability with nullable unique fields, lacks variant FKs on template/quotation/subscription lines, and lacks explicit global/subscription discount targets. These require a reviewed migration before the relevant API can claim those capabilities. Offline writes remain unapproved.
