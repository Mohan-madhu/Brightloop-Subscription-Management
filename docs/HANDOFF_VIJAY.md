# Vijay backend handoff

## Second Pass Status

- Branch: `vijay/second-pass`
- Code verification commit: `4259736` (`fix(api): harden billing, email outbox, reports, and payment verification`)
- Integration merges included: `0971caf` (`origin/integration/mvp` at `ba8a593`) and `0fa8005` (`vijay/backend` at `bafc523`).
- Unit tests: **216 passing, 0 failing**.
- TypeScript typecheck: **passing**.
- Prisma schema validation: **passing** with a dummy `DATABASE_URL`.
- Database-backed integration tests: **NOT RUN** (no isolated database).
- Live SMTP and Razorpay tests: **NOT RUN** (no credentials; no unsolicited email or real money).

## Real Code Fixes in This Pass

1. **Billing `asOf` normalization** (`services/billing-calendar.js`, `services/billing.js`):
   Added `asOfDateFor` so Date and `YYYY-MM-DD` inputs both resolve to an Asia/Kolkata billing date. `runDueBilling` now also reports `CATCH_UP_TRUNCATED` for a single-subscription run.
2. **CSRF protection** (`modules/{invoices,payments,reports,jobs}/routes.js`):
   Applied the existing `requireCsrf` middleware after actor resolution. Safe `GET`/`HEAD`/`OPTIONS` requests continue without a CSRF token.
3. **Email outbox recovery and idempotency** (`services/email.js`, `services/invoices.js`):
   - Claims now write `CLAIMED` logs; delivery writes a `SENDING` log before SMTP.
   - Stale `PROCESSING` rows are recovered only after the 30-minute stale window and classified as `PENDING`, `FAILED`, or `UNCERTAIN` instead of blindly resetting every row.
   - `attempts === 5` rows are not left permanently stuck.
   - Template rendering moved inside the error boundary.
   - SMTP configuration and recipients are validated before opening a connection; TLS handshakes are always awaited.
   - `sendInvoice` reuses an existing pending invoice email instead of queueing a duplicate.
4. **Kanban response contract** (`services/reports.js`):
   Each bucket now includes up to 10 `invoices` summaries (bounded preview) plus the full bucket `count` and `balance`, matching `apps/web/features/najid/types.ts`.
5. **Quarterly report download** (`services/quarterly-reports.js`, `modules/reports/routes.js`):
   Added `GET /api/v1/reports/quarterly/:id/download` returning CSV. `downloadAvailable` is true only for completed runs with stored summary data. Runs with `RUNNING` and null `startedAt` can be reclaimed.
6. **Invoice issue dates** (`services/serializers.js`):
   `issueDate` now uses the Asia/Kolkata calendar date instead of the UTC date.
7. **Razorpay verification hardening** (`services/razorpay.js`):
   Reject provider orders without an `id`, captured amounts at or below zero, and payments applied to invoices in a non-payable status.

## Tested Flows

```powershell
npm test -w @brightloop/api
# 216 tests, 216 pass, 0 fail

npm run typecheck
# pass

$env:DATABASE_URL='postgresql://user:pass@localhost:5432/brightloop_validate'
npm run prisma:validate -w @brightloop/api
# schema valid
```

New focused tests in `apps/api/test/second-pass-fixes.test.js` cover:
- `asOfDateFor` with Date and date-string inputs, including IST midnight boundaries and malformed dates.
- IST conversion for invoice `issueDate`.
- Email recovery classification for `CLAIMED`, `SENDING`, `ACCEPTED`, null, `FAILED`, and exhausted attempts.
- Quarterly `downloadAvailable` only when completed with summary data.

Existing tests continue to cover billing idempotency, concurrent billing, payment allocation, webhook deduplication/signature rejection, calendar anchoring, discount caps, quarterly retry, and customer isolation. Most of these are deterministic simulations; they do not prove real database behavior.

## NOT RUN / Environment Blockers

- **Database-backed checks are NOT RUN.** `apps/api/.env` exists locally but points at a shared remote PostgreSQL instance. It is ignored by Git and was never committed. No isolated test database is available; local PostgreSQL 17 is running but credentials are unknown, and Docker is unavailable.
- **Live SMTP is NOT RUN.** `EMAIL_DELIVERY_ENABLED=false` and `JOBS_ENABLED=false` remain the safe defaults. No unsolicited emails were sent.
- **Live Razorpay is NOT RUN.** No real order or payment was created; no money moved.
- **PDF generation is not implemented.** Invoice output remains printable HTML (`renderInvoicePrint`); the frontend labels it “Print / download”.
- **Web lint is NOT RUN successfully.** `npm run lint` fails while loading the local ESLint React plugin because `node_modules` is missing `es-abstract/2024/AddEntriesFromIterable`. This is a local tooling/dependency issue, not a lint result. Typecheck passes.

## Schema Changes Reported to Mohan

Do not change these independently; coordinate with Mohan:

1. `PlanProduct`: `@@id([planId, productId, isAddon])` omits `variantId`, so a plan cannot hold two variants of the same product.
2. `TaxApplicability`: `@@unique([taxId, productId, planId])` does not prevent duplicate global rows because PostgreSQL treats nulls as distinct.
3. `DiscountTarget`: no explicit target type for whole-quotation/global discounts.
4. `EmailOutbox`: no `claimedAt`, `lastAttemptAt`, `nextAttemptAt`, or `lastError`; recovery currently uses `MessageLog` records as a workaround.
5. `WebhookEvent.providerEventId` is globally unique rather than unique per provider.
6. `ProviderOrder`: no status/consumed flag, no unique idempotency key, and no `Payment.providerOrderId` relation. Repeated create-order requests can create multiple provider orders.
7. `BillingPeriod.endsAt` is exclusive by convention only; the schema does not encode the half-open interval.
8. `InvoiceStatus.OVERDUE` is unused; overdue remains derived from due date and balance.

## Integration Wiring (already present)

`apps/api/src/app.js` mounts the Razorpay webhook before `express.json()`, then mounts `invoicesRouter`, `invoicePaymentsRouter`, `paymentsRouter`, `reportsRouter`, and `jobsRouter` behind `requireAuth`. `apps/api/src/server.js` starts and stops the scheduler. Billing routers now also enforce CSRF on mutations.

## Key Files

- `apps/api/src/services/billing-calendar.js`, `billing.js`, `pricing.js`, `money.js`
- `apps/api/src/services/invoices.js`, `payments.js`, `payment-rules.js`
- `apps/api/src/services/razorpay.js`, `razorpay-signature.js`
- `apps/api/src/services/email.js`
- `apps/api/src/services/reports.js`, `reporting-rules.js`, `quarterly-reports.js`
- `apps/api/src/services/serializers.js`
- `apps/api/src/modules/{invoices,payments,webhooks,reports,jobs}`
- `apps/api/src/modules/billing/access.js`, `validation.js`
- `apps/api/prisma/schema.prisma` (read-only for this pass)
- `apps/api/test/second-pass-fixes.test.js` and existing API tests
