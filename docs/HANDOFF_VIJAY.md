# Vijay backend handoff

## Second Pass Status

Second pass completed and verified on branch `vijay/backend`.
Unit test suite: **37 passing, 0 failing** across 7 test suites, covering all 10 meaningful failure scenarios requested.
Exact verification commit: `f36225e` (author: `vijaym-143 <msvijayvijay3@gmail.com>`).

### Real Code Fixes Implemented

1. **Prisma query argument fix (`apps/api/src/services/razorpay.js`)**:
   Fixed `findUnique` query argument from non-existent compound `provider_providerEventId` to the actual schema-unique field `providerEventId` in webhook deduplication lookups (lines 218 and 229).
2. **Kolkata calendar anchor on resume (`apps/api/src/services/billing.js`)**:
   Enforced strict Asia/Kolkata date boundary extraction via `dateOnlyFromTz` on `resumeStartFor` to guarantee no drift when resumes occur near UTC midnight.
3. **Access boundary defensive fallback (`apps/api/src/modules/billing/access.js`)**:
   Added client injection and fail-closed error handling in `customerIdFor` and scope functions so database disconnections or unlinked customer accounts cleanly deny access (`{ id: '__no_customer_record__' }`) instead of unhandled runtime errors.
4. **Response fields matching Najid's frontend models (`apps/api/src/services/serializers.js`, `reports.js`, `quarterly-reports.js`)**:
   - `serializeInvoiceSummary`: added `customerEmail` and `issueDate`.
   - `serializeInvoice`: added `customerAddress` and `history` status logs.
   - `serializePayment`: added `reference` (aliased to `providerPaymentId ?? id`).
   - `getDashboard`: added `invoiced`, `collected`, `outstanding`, `overdueCount`, and `currency: 'INR'` matching `FinanceDashboardView`.
   - `getDueKanban`: added `key` matching `KanbanBucketView`.
   - `serializeReportRun`: added `period` and `downloadAvailable` matching `QuarterlyReportView`.

## Tested Flows & Verified Failure Cases

Run:
```powershell
npm test -w @brightloop/api
```
Result: **37 passing, 0 failing**.

Specific failure cases verified in `apps/api/test/failure-cases.test.js`:
- **Billing idempotency**: Running billing twice produces only one recurring invoice per subscription/period; subsequent scans return 0 periods.
- **Concurrent billing safety**: Advisory lock serialization and database-backed `BillingPeriod` uniqueness (`subscriptionId_startsAt_endsAt`) safely reject concurrent duplicate runs with `PERIOD_ALREADY_EXISTS`.
- **Partial and final payment allocation**: Partial payment transitions balance and marks `PARTIALLY_PAID`; exact remaining balance payment closes balance to `0.00` and marks `PAID`. Overpayment and payments against zero balance throw validation errors.
- **Webhook deduplication**: Duplicate webhook event payloads with the same `providerEventId` return `DUPLICATE_EVENT`. Replays under different event IDs for an already confirmed `providerPaymentId` return `{ applied: false, duplicate: true }` without altering balance.
- **Bad signature rejection**: Invalid HMAC-SHA256 signatures, tampered payloads, or incorrect secrets fail verification upfront and reject without touching database state.
- **Month-end and leap-year calendar anchoring**: January 31 correctly clamps February to 28 (or 29) and restores anchor to 31 for March and subsequent months. Leap-year February 29 preserves the 29th day anchor across non-leap years (Feb 28) and restores to Feb 29 in the next leap year.
- **Ineligible subscription filtering**: `PAUSED`, `CLOSED`, and `EXPIRED` subscriptions do not generate invoices. Subscriptions with `expiryDate` cap periods at expiry and produce zero post-expiry periods. Resumed subscriptions start the next period at the resume date.
- **Discount cap race protection**: Discount with `usageLimit` is reserved via `FOR UPDATE` count of active usages. Concurrent drafts past the limit are excluded; cancelling a draft releases usage and restores eligibility.
- **Quarterly report retry idempotency**: A completed report run returns `ALREADY_COMPLETED`; an in-progress run returns `IN_PROGRESS`. Retries never duplicate the quarterly report run or email attachment.
- **Customer record isolation**: Invoices and payments are strictly scoped to `req.auth.customerId`. Requests across customer boundaries resolve to non-matching records and return 404.

## Honest Status: Unverified / Marked NOT RUN

In accordance with safety guidelines:
- **NOT RUN: Live shared PostgreSQL mutation suite**: The configured remote database (`187.127.189.231:5432`) is a shared environment. Destructive testing or test-data pollution against the shared DB was deliberately omitted.
- **NOT RUN: Live SMTP transmission**: `EMAIL_DELIVERY_ENABLED=false` was preserved. Live Gmail delivery was not triggered to prevent unsolicited emails.
- **NOT RUN: Real-money Razorpay transactions**: Verified with simulated test orders and cryptographic webhook HMAC signatures; no live money was moved.

## Schema Changes Reported to Mohan

The following schema refinements are needed for future iterations and should be coordinated by Mohan:
1. `WebhookEvent`: The Prisma model defines `providerEventId String @unique`. If event IDs should be unique per provider rather than globally unique, update to `@@unique([provider, providerEventId])`.
2. `SubscriptionLine.variantId`: Currently defined as `String?` without a Prisma `@relation` to `ProductVariant`. Needs a foreign key constraint.
3. `TaxApplicability`: The schema lacks nullable unique indexes for global tax applicability.
4. `DiscountTarget`: Currently targets `product`, `variant`, or `plan`; lacks target types for whole-quotation or whole-subscription discounts.

## Required Integration Wiring (Reminder for Integration Owner)

Mount in `apps/api/src/app.js`:
- `app.use('/api/v1/webhooks', razorpayWebhookRouter)` (MUST be placed before `express.json()`).
- `app.use(express.json({ limit: '100kb' }))`.
- Protected routers mounted behind session/token guard:
  - `app.use('/api/v1/invoices', requireAuth, invoicesRouter)`
  - `app.use('/api/v1/invoices', requireAuth, invoicePaymentsRouter)`
  - `app.use('/api/v1/payments', requireAuth, paymentsRouter)`
  - `app.use('/api/v1/reports', requireAuth, reportsRouter)`
  - `app.use('/api/v1/jobs', requireAuth, jobsRouter)`
Scheduler in `apps/api/src/server.js`:
- `startScheduler()` / `stopScheduler()` from `src/jobs/scheduler.js`.

## Key Files

- `apps/api/src/services/billing-calendar.js`, `pricing.js`, `money.js` — Shared calculations and calendar anchoring.
- `apps/api/src/services/billing.js` — Recurring billing and transactional locks.
- `apps/api/src/services/invoices.js`, `payments.js`, `payment-rules.js` — Invoices and payment lifecycle.
- `apps/api/src/services/razorpay.js`, `razorpay-signature.js` — Razorpay orders, verifications, and signed webhooks.
- `apps/api/src/services/email.js` — Transactional outbox, MIME generation, and template rendering.
- `apps/api/src/services/reports.js`, `reporting-rules.js`, `quarterly-reports.js` — Reporting, Kanban, and quarterly runs.
- `apps/api/src/modules/billing/access.js` — Actor normalization and record scoping.
- `apps/api/src/modules/{invoices,payments,webhooks,reports,jobs}` — Exported routers.
- `apps/api/test/*.test.js` — 37 unit and failure scenario tests.
