# Billing, payments, email and reports contract

This document records the behaviour implemented by Vijay's billing module. It supplements `IMPLEMENTATION_CONTRACT.md` and `API_CONVENTIONS.md`; it does not change either.

## Money and dates

- Money is INR and is returned as a two-decimal string (`"1234.50"`), never a JavaScript number.
- Arithmetic uses `Prisma.Decimal` with `ROUND_HALF_UP` to two places. Tax is calculated per line and rounded per line, then summed.
- Billing dates are calendar dates in `Asia/Kolkata`. A billing period is `[startsAt, endsAt)`; `endsAt` is exclusive.
- A due date is `period.startsAt + paymentTerms` days. Missing or unparseable terms mean due on the period start date.
- `today` means the current date in `Asia/Kolkata`. Invoice overdue is derived from `dueDate < today` and `balance > 0`; it is never written into the invoice status.

## Billing rules

- Only `ACTIVE` subscriptions are billed, and only for periods starting on or before the billing run's `asOf` date.
- Monthly/yearly periods preserve `Subscription.billingAnchorDay`. Short months clamp to the month end and return to the anchor afterwards (for example 31 Jan -> 28/29 Feb -> 31 Mar).
- Expiry caps the final period at `expiryDate + 1 day` without proration.
- A resume after pause starts a new period at the resume timestamp. Paused time is not prorated or backfilled.
- Billing catch-up is capped at 520 periods per run. `CATCH_UP_TRUNCATED` is reported and the remaining periods are generated on the next run.
- Each period is unique by subscription/start/end. Invoice numbers are `INV-<period start YYYYMMDD>-<subscription number>`.
- Invoice generation creates a `DRAFT` invoice and a `DRAFT` status log.
- Subscription line prices (`SubscriptionLine.agreedPrice`) are the billable unit prices. The unresolved plan-price formula is documented in `BLOCKERS_VIJAY.md`.

## Discounts and taxes

- One discount may apply per invoice.
- A discount is eligible when active, inside its start/end window, above its minimum purchase/quantity, below its usage limit, and matching at least one line target. A discount with no targets applies to the whole invoice.
- Selection uses the deterministic proposal in `DATABASE.md`: highest monetary reduction, then earliest `startsAt`, then `code`.
- Discount usage is reserved when the draft invoice is created, consumed on confirmation, and released on cancellation. Cancelled/released usage no longer counts against `usageLimit`.
- Discount allocation is proportional to each line's pre-discount amount, with the remainder assigned to the final line. The discount cannot exceed the subtotal.
- Only active, tax-exclusive taxes are applied. Tax applicability is by product and/or plan; a tax with no applicability rows applies to all lines.

## Invoice lifecycle

- `DRAFT -> CONFIRMED -> SENT` is the email path. Payment moves an issued invoice to `PARTIALLY_PAID` or `PAID`.
- Only `DRAFT` invoices can be confirmed.
- Issued invoices can be sent by email. Cancellation is allowed only while there are no confirmed payments and only from `DRAFT`, `CONFIRMED` or `SENT`.
- Confirmation queues the invoice email when the customer has a billing email. It does not require email delivery to be enabled.
- The printable endpoint returns HTML and escapes all customer/company data.

## Payments

- Manual payments support `CASH`, `BANK_TRANSFER`, `UPI`, `CHEQUE`, `CARD` and `OTHER`. They require Admin or Finance.
- Manual payments must be positive, at most the outstanding balance, and not more than five minutes in the future. Overpayments are rejected.
- A partial payment produces `PARTIALLY_PAID`; exact settlement produces `PAID`.
- Razorpay orders are created for the current invoice balance in paise and stored as `ProviderOrder` rows. Customers can pay only visible invoices.
- Razorpay webhooks require the raw body, the `x-razorpay-signature` HMAC-SHA256 signature and `RAZORPAY_WEBHOOK_SECRET`. Events are idempotent by provider event ID.
- A captured payment must match the stored order, currency and amount. Duplicate confirmed payments are ignored. Failed payments are recorded as `FAILED`; a later captured event for the same provider payment upgrades it.
- Server-side verification fetches the payment from Razorpay and applies the same captured-payment rules.
- Amounts exceeding the current balance, cancelled invoices and mismatched orders require manual reconciliation; they are not automatically overwritten.

## Email and jobs

- Email is written to `EmailOutbox` first; confirmation never waits for SMTP.
- Delivery is disabled unless `EMAIL_DELIVERY_ENABLED=true`. `processEmailOutbox` claims rows with `FOR UPDATE SKIP LOCKED`, increments attempts and retries transient failures.
- SMTP uses STARTTLS on port 587 or implicit TLS on 465, with optional `AUTH LOGIN`. A message is marked `SENT` only after the server accepts it. Timeouts or database failures after acceptance are marked `UNCERTAIN` to avoid blind duplicate sends.
- An invoice email is skipped if the invoice was cancelled before delivery.
- `JOBS_ENABLED=true` enables the scheduler. Billing defaults to 15 minutes, email to one minute, quarterly reports to daily. `POST /jobs/*` provides protected manual runs.

## Reports

- Dashboard ranges default to the first day of the current month through today in `Asia/Kolkata`, and are limited to 732 days.
- `invoicedAmount` is non-cancelled issued invoice totals whose `createdAt` is inside the range.
- `collectedAmount` is confirmed payments whose `paidAt` is inside the range, excluding cancelled invoices.
- `outstandingBalance` and `overdueBalance` are current open balances, independent of the range.
- Due Kanban buckets are `overdue`, `today`, `next_2_days`, `rest_of_7_days` and `later`; each open invoice with a balance appears in exactly one bucket.
- Quarterly reports cover calendar quarters (`YYYY-Qn`). `invoicedAmount` and `collectedAmount` use the quarter window; `outstandingBalance` is the balance on quarter-issued invoices at report generation time.
- Quarterly delivery is queued only when `REPORT_RECIPIENTS` contains valid addresses. The CSV is attached through the same outbox and obeys `EMAIL_DELIVERY_ENABLED`.
- Report runs are unique by type and period. A completed run is not regenerated automatically; failed or stale runs may be retried.

## Role and scope rules

| Role | Scope |
| --- | --- |
| `ADMIN` | All invoices, payments, subscriptions, reports and jobs |
| `FINANCE` | All invoices, payments, subscriptions and reports; no jobs |
| `MARKETING` | Customers assigned through `CustomerAssignment` only |
| `CUSTOMER` | Its own customer record only |

The access layer expects `req.auth = { userId, roles, customerId? }`. Roles may be code strings or nested role objects; they are normalised to uppercase. If `customerId` is absent for a customer role, the module resolves it from `Customer.userId`.

## Endpoint additions

All routes are under `/api/v1` and return the shared response shapes.

| Method | Path | Roles |
| --- | --- | --- |
| `GET` | `/invoices` | All authenticated, scoped |
| `GET` | `/invoices/:id` | All authenticated, scoped |
| `POST` | `/invoices/:id/confirm` | Admin, Finance |
| `POST` | `/invoices/:id/send` | Admin, Finance |
| `POST` | `/invoices/:id/cancel` | Admin, Finance |
| `GET` | `/invoices/:id/print` | All authenticated, scoped |
| `POST` | `/invoices/:id/payments` | Admin, Finance |
| `POST` | `/invoices/:id/razorpay/order` | All authenticated, scoped |
| `GET` | `/payments` | All authenticated, scoped |
| `POST` | `/payments/razorpay/verify` | All authenticated, scoped |
| `GET` | `/reports/dashboard` | All authenticated, scoped |
| `GET` | `/reports/due-kanban` | All authenticated, scoped |
| `GET` | `/reports/due-kanban/:bucket` | All authenticated, scoped |
| `GET` | `/reports/quarterly` | Admin, Finance |
| `POST` | `/reports/quarterly/run` | Admin, Finance |
| `POST` | `/jobs/billing/run` | Admin |
| `POST` | `/jobs/email/run` | Admin |
| `GET` | `/jobs/status` | Admin |
| `POST` | `/webhooks/razorpay` | Razorpay signature |
