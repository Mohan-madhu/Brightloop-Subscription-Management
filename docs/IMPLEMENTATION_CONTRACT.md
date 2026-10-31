# Brightloop implementation contract

This document is the integration contract for the initial backend modules. Express owns authorization and all writes; the web application calls only `/api/v1` endpoints. Responses use the shapes in `API_CONVENTIONS.md`. Money is an INR decimal string with two fractional digits and dates are `YYYY-MM-DD`.

## Authentication and authorization

Authenticated endpoints use `Authorization: Bearer <access-token>`. The access token carries only a user ID; Express resolves active roles and record access for every request. Admin has full access, Marketing has only assigned customers, Finance has financial access, and Customer has only its own customer record. Public requests cannot set staff roles.

Planned routes are `POST /auth/login`, `POST /auth/activate`, `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`, and `GET /auth/me`. Admin-only staff creation is `POST /staff`. Activation and reset flows consume one hashed, expiring token. The exact login/session transport is an implementation decision that must be finalized before frontend authentication work starts.

## Catalog configuration

Admin-only routes are `/products`, `/products/:id`, `/plans`, `/plans/:id`, `/taxes`, and `/discounts`. Collection routes use the shared pagination query parameters. Product and plan writes accept only catalog fields represented in `schema.prisma`; prices are decimal strings. Plans own billing intervals. Catalog APIs do not calculate invoices.

## Customers, quotations, and subscriptions

Customer records use `/customers`; customer assignment is `/customers/:id/assignments`. Marketing record access is checked against `CustomerAssignment`. Quotations use `/quotations` and subscriptions use `/subscriptions`; accepted quotation conversion is a single database transaction. Subscription lifecycle actions are explicit status-transition routes and append status logs. Billing lines and periods are owned by the schema but invoice generation remains Vijay's billing module.

## Backend conventions for team members

Import the singleton Prisma client from `apps/api/src/db/prisma.js`. Use `prisma.$transaction` for a conversion or any multi-record state change. Reuse the shared pagination validator and centralized error response middleware. Never query Prisma from the frontend, calculate authoritative totals in the browser, or bypass record-access checks.

## Current database limitations

The current schema does not enforce a single global tax applicability row because nullable columns are distinct in PostgreSQL unique indexes. It also does not relate variant IDs on template, quotation, or subscription lines by foreign key, and it does not represent global/subscription discount targets. Do not make these fields behave as if those missing constraints exist; schema changes require Mohan's reviewed migration.
