# Vijay module blockers and decisions

Updated 2026-10-31. This list distinguishes code that is ready from decisions or integration work owned by others.

## Decisions needed before production

| Item | Current implementation | Needed decision |
| --- | --- | --- |
| Plan price formula | `SubscriptionLine.agreedPrice` is the billable unit price; `Plan.price` and `PlanProduct.price` are not added on top. | `DATABASE.md` still calls this unresolved. Confirm whether plan/product prices replace or supplement the agreed line price. |
| Tax-inclusive taxes | Only active `taxExclusive=true` taxes are applied. | Confirm whether tax-inclusive prices must be supported and, if so, the extraction/rounding formula. |
| Discount targets | A discount with no targets applies to every line. There is no explicit subscription/global target. | Schema has no subscription/global target relation; confirm that "no targets = global" is acceptable. |
| Quarterly recipients | Addresses come from `REPORT_RECIPIENTS` and receive a CSV attachment through the email outbox. | Confirm recipients, cadence, subject and whether a generated file should instead be stored/downloadable. |
| Outstanding in quarterly reports | Balance on invoices issued in the quarter, at generation time. | No historical balance snapshot exists; confirm current-balance semantics. |
| Paused/resumed billing | Resume starts a new period at the resume date; paused days are not prorated. | Confirm no credit/proration is required for the MVP. |
| Razorpay overpayment | A captured payment above the current balance is not applied; the webhook is recorded and requires manual reconciliation. | Confirm refund/reconciliation process is out of scope. |

## Schema gaps

These are unchanged schema limitations; no migration was created.

- `TaxApplicability @@unique([taxId, productId, planId])` does not prevent duplicate global rows because PostgreSQL treats `NULL` values as distinct.
- `PlanProduct @@id([planId, productId, isAddon])` omits `variantId`, so one plan/product/add-on combination cannot hold multiple variants.
- `DiscountTarget` has no subscription or explicit global target, and `DiscountUsage` has no customer/period identity beyond the invoice.
- `EmailOutbox` has no `claimedAt`, `nextAttemptAt`, `lastError` or `updatedAt`. Retry backoff cannot be scheduled; startup recovery resets every `PROCESSING` row and is only safe with one worker process.
- `WebhookEvent` has no processing error/attempt fields. A permanently rejected event stores only `processedAt`; the reason is in the HTTP response and logs, not queryable history.
- `Payment` has no direct `providerOrderId` foreign key. Razorpay matching uses `providerPaymentId` plus the order lookup in the event/payment flow.
- `ReportRun` has no outbox/delivery status columns; delivery metadata is in `metadata` JSON and there is no resend action.
- `BillingPeriod.endsAt` is implemented as exclusive, but the database does not enforce that semantic. Adjacent periods are prevented by the unique key and transaction logic.
- `InvoiceStatus.OVERDUE` exists but is intentionally unused; overdue is derived.

## Integration dependencies

- **Auth guard owned by Mohan:** all new routers call `requireActor` and expect `req.auth = { userId, roles, customerId? }`. Without the token guard populating this object, they return `401 AUTH_REQUIRED`.
- **`apps/api/src/app.js` not modified:** routes are exported but not mounted. See `HANDOFF_VIJAY.md` for the exact import/mount order. The Razorpay webhook must be mounted before the global `express.json()` parser.
- **`apps/api/src/server.js` not modified:** `startScheduler()` is exported but not called. Jobs remain off unless integration explicitly starts them and `JOBS_ENABLED=true`.
- **Database verification:** no `apps/api/.env`, test database or Docker runtime was available. `prisma generate`, syntax checks and pure unit tests pass; migrations, seed, Prisma queries and HTTP flows were not executed against PostgreSQL.
- **SMTP:** no Gmail/SMTP credentials were available. The custom STARTTLS/TLS client is unit-tested for MIME construction and header safety but has not sent a live message.
- **Razorpay:** no test/live keys were available. Order creation, provider verification and webhook processing were not exercised against Razorpay.

## Operational notes

- `EMAIL_DELIVERY_ENABLED=false` is the safe default: emails are queued but not claimed.
- `JOBS_ENABLED=false` is the safe default: no background timers start.
- `UNCERTAIN` email rows are deliberately not retried automatically; SMTP acceptance was not confirmed and a blind retry could duplicate a message. An operator should reconcile before resending.
- `SKIPPED` email rows are cancelled invoice emails prevented at delivery time.
- The test command runs `prisma generate` first. Unit tests do not need a reachable database; route/service integration tests do.
- No refunds, auto-debit, customer self-service payment history or PDF generation were added.
