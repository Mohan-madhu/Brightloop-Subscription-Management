# Najid frontend handoff - second pass

## Routes and integration

- Finance: `/finance`, `/finance/invoices`, `/finance/invoices/[invoiceId]`, `/finance/payments`, `/finance/kanban`, `/finance/reports`.
- Customer: `/portal`, `/portal/invoices`, `/portal/invoices/[invoiceId]`, `/portal/subscriptions`, `/portal/subscriptions/[subscriptionId]`.
- Feature routes reuse Basim's `AppShell`, `SessionProvider`, `useSession`, `apiRequest`, `apiListRequest`, `Badge`, `Pagination`, `LoadingState`, `EmptyState` and `ErrorState`. Session cookies are sent by the shared client; mutations read `bl_csrf` and send `x-csrf-token`.
- `/auth/me` currently returns `userId`, `kind`, `roles`, `customerId`, `sessionId` and `csrfTokenHash`, but omits `email`; Basim's `SessionUser` requires it. The Najid adapter does not display the missing field and only uses id/roles. Login UI is not present in Basim's branch, so an existing valid session is required.
- Invoice and payment list requests use server pagination (20 rows) and exact supported filters. Customer profile is resolved from the authenticated, server-scoped `GET /customers?page=1&pageSize=1`; no customer ID selector is used. Invoice/payment customer scope is enforced by Express, not the UI.

## Contract-backed UI flows

- Finance dashboard uses `GET /reports/dashboard?from=&to=` fields `activeSubscriptions`, `invoicedAmount`, `collectedAmount`, `outstandingBalance`, `overdueBalance`, `overdueInvoiceCount`, and `range`.
- Invoice list/detail uses `GET /invoices` and `GET /invoices/:id`. It displays the immutable snapshot fields, line taxes/discounts/totals, payments and status logs. The serializer supplies `createdAt`, `dueDate`, `total`, `balance`, `customerSnapshot`, `lines`, `payments`, and `logs`; it does not supply a customer email in list rows.
- Confirm/cancel/send use the documented POST routes, role/status checks, confirmation dialogs, shared API errors and a refetch after success. Manual payments POST decimal-string `amount`, mapped enum `method`, `paidAt`, and `note`; the form prevents zero, malformed and above-balance values, then refetches the invoice balance.
- Invoice print opens the server HTML endpoint `/invoices/:id/print?print=1`; it is browser print output, not a PDF endpoint.
- Due-date board uses `/reports/due-kanban` counts plus paginated `/reports/due-kanban/:bucket` pages. Cards are read-only; no drag/drop mutation exists.
- Quarterly report list/run uses `/reports/quarterly` and `/reports/quarterly/run`; displayed state is refetched from `ReportRun`. There is no direct download route. The backend may queue CSV email delivery according to `REPORT_RECIPIENTS` and its returned `metadata.deliveryNote`.
- Customer invoice/payment lists use the authenticated `/invoices` and `/payments` endpoints with their server-side customer scope. The dashboard outstanding amount comes from the scoped report endpoint.
- Customer Razorpay flow requests a server-created order, requires an `rzp_test_` key before opening checkout, submits provider IDs to `/payments/razorpay/verify`, then polls/refetches the invoice at 1.5-second intervals up to five times. Browser callback values never mark an invoice paid. Dismissal, provider failure and verification failure remain retryable.
- Subscription detail reads `/subscriptions/:id`; supported actions call `/subscriptions/:id/actions` and refetch. The action payloads are only `PAUSE`, `RESUME`, and `CLOSE`.

## Backend mismatches and unavailable actions

- There is no own-customer subscription list route, so `/portal/subscriptions` reports the dependency instead of showing an empty/fabricated list. The detail route is usable only when the customer already has the ID.
- There is no customer line/add-on/quantity mutation route and no `RENEW` action. Those controls are withheld; line snapshots are read-only.
- The billing rule requires pause at a billing boundary, but the current action service changes status immediately. Pause is therefore withheld. `CLOSE` checks `allowEarlyClosure`; `allowEndDateClosure` is not used by the service. The UI only shows close when `allowEarlyClosure` is true.
- Subscription responses contain no next-billing date; the UI says it is not provided.
- Quarterly reports have no direct download endpoint. No download button or fabricated file status is shown.
- `origin/integration/mvp` was fetched but not merged: its published history contains a tracked `apps/api/.env` with configured non-placeholder values. Merging/pushing that history would include environment credentials, contrary to the no-secret rule. No values were copied or printed. The shared frontend commit from Basim was cherry-picked separately; integration sync remains blocked pending removal/rotation and safe history cleanup by the repo owners.

## Verification

- Contract mappings and authorization behavior were reviewed against the fetched `BILLING_CONTRACT.md`, `IMPLEMENTATION_CONTRACT.md`, Express routes, serializers and billing access layer. This is code review, not runtime authorization testing.
- No API/DB environment or demo session is configured in this branch. Finance/Customer API smoke tests, cross-customer UI test, invoice mutation workflows, print response, and Razorpay checkout are **NOT RUN**. Razorpay test credentials were not used.
- Typecheck, lint and production build are **NOT RUN**: dependency installation stalled with no toolchain available (`tsc`, `eslint`, `next`). `npm ci` also warned of a damaged lockfile; installation attempts used `--package-lock=false` and did not alter the lockfile.
- No PWA, cache, online/offline indicator, quotation persistence or sync was implemented. Offline write scope remains unconfirmed.
