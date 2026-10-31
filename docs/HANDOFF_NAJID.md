# Najid frontend handoff

## Owned pages and components

Added the Finance routes `/finance`, `/finance/invoices`, `/finance/invoices/[invoiceId]`, `/finance/kanban` and `/finance/reports`; and Customer routes `/portal`, `/portal/subscriptions` and `/portal/invoices`. These routes currently show a clear API/session dependency notice instead of invented records or nonfunctional actions.

Added feature-only, data-driven screens under `apps/web/features/najid/` for the finance dashboard, invoice list/detail and manual partial payment, due-date board, quarterly reports, customer account view and subscription lifecycle/add-on/quantity/payment flows. These UI view models are expressly internal presentation models, not API response contracts. The components accept server-backed data, pagination, permissions and callbacks, and expose loading, empty, error/retry and duplicate-submission states.

## Verified flows

The repository at implementation time has only the documented health and public company/billing-interval API routes. Finance and customer business pages have no routes in `docs/openapi.yaml`, and there is no shared authenticated API client/session contract or `docs/FRONTEND_SHARED.md`. As a result, no real finance or customer workflow could be run end-to-end. The feature components implement validated presentation and callback flows, but are not mounted with fabricated data.

No successful backend integration, payment, invoice approval, download, report run, or customer lifecycle flow is claimed. `npm ci` did not finish and reported `invalid or damaged lockfile`; the resulting install did not provide `tsc`, `eslint` or `next`. The requested typecheck, lint and production build commands were attempted and each stopped because its executable was unavailable. No desktop/mobile browser smoke test was possible without the web runtime.

## Backend and shared frontend dependencies

- **Basim:** commit/document the shared responsive shell, session/permission context, API client interface and error conventions. The authentication/session transport is explicitly undecided in `docs/IMPLEMENTATION_CONTRACT.md`.
- **Vijay:** publish OpenAPI paths and request/response details for dashboard reporting/date filters; invoice paginated list/detail, status history, confirm/cancel/send permissions/actions and print/download; manual payments and payment history; due-date buckets/counts; quarterly report list/run/status/download; and Razorpay test order creation plus server verification/refetch.
- **Mohan:** publish own-customer profile/record scoping and subscription list/detail/lifecycle/action permission APIs. Include plan flags, optimistic version behavior, add-on/quantity change semantics and next-period effective date.
- **Team:** confirm the display date/timezone contract and status enum-to-label mapping. Use server invoice totals and INR decimal strings as required by current docs.

No endpoint paths, payload shapes, API client or session behavior were invented. The internal screen prop models need an adapter to the final contracts before connection.

## Payment verification behavior

The subscription-detail UI reports pending while checkout is in progress and only shows a verified message when its integration callback receives the backend-verified result. A checkout adapter must use a server-created order, call backend verification, then refetch invoice/payment status; a browser payment callback alone must never mark an invoice paid. Failure/dismissal can be surfaced by the adapter through the failed result callback. This path is not live until Vijay documents and implements those APIs and Basim's authenticated API client is available.

## Offline status

No PWA, cache, quotation-draft persistence or sync behavior was implemented. Offline write scope remains pending explicit confirmation. Financial actions remain online-only; no offline approvals, payment mutations or broad mutation queue were added.
