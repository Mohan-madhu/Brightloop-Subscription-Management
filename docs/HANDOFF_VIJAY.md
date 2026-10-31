# Vijay backend handoff

## Status

The billing, invoice, payment, Razorpay, email, dashboard/Kanban, quarterly report, job and test code is implemented on `vijay/backend`. It is intentionally not wired into the shared bootstrap: `apps/api/src/app.js` and `apps/api/src/server.js` are owned by the integration owner.

Implemented and unit-tested:

- Recurring billing with anchored calendar periods, catch-up, expiry, resume-after-pause, serializable transactions and advisory locks.
- Decimal pricing, per-line tax, one discount with reservation/consumption/release and proportional allocation.
- Invoice draft/confirm/send/cancel/print flows and audit logs.
- Manual payments and Razorpay order, verification and signed webhook flows.
- Gmail-compatible SMTP outbox, retries, uncertain-delivery handling and invoice/quarterly templates.
- Scoped dashboard, due Kanban, quarterly summary/CSV/report runs.
- Protected manual jobs and an optional scheduler.
- 27 pure unit tests covering calendar, pricing, payment rules, Kanban boundaries, signatures and MIME construction.

Not verified: PostgreSQL migrations/seed/queries, live SMTP, live Razorpay, and HTTP integration through Express. See `BLOCKERS_VIJAY.md`.

## Auth contract

The new routers use `requireActor` from `modules/billing/access.js` as a defensive check. The real token guard must set:

```js
req.auth = {
  userId: '<User.id>',
  roles: ['ADMIN'], // code strings; nested { role: { code } } objects also work
  customerId: '<Customer.id or null>' // optional; resolved from Customer.userId when absent
};
```

Role scopes are in `BILLING_CONTRACT.md`. A request without `userId` and an array of roles receives `401 AUTH_REQUIRED`.

## Required app.js integration

Mount the webhook before the global JSON parser. The webhook router installs its own `express.raw()` parser. If it is mounted after `express.json()`, `req.body` is already an object and the handler returns `RAW_BODY_REQUIRED`.

```js
import { invoicesRouter } from './modules/invoices/routes.js';
import { invoicePaymentsRouter, paymentsRouter } from './modules/payments/routes.js';
import { reportsRouter } from './modules/reports/routes.js';
import { jobsRouter } from './modules/jobs/routes.js';
import { razorpayWebhookRouter } from './modules/webhooks/razorpay.routes.js';

// Existing middleware: pinoHttp, helmet, cors

// 1. Webhook must be before express.json().
app.use('/api/v1/webhooks', razorpayWebhookRouter);

// 2. Existing parser.
app.use(express.json({ limit: '100kb' }));

// 3. Existing health/public routes.

// 4. Mohan's token guard. Mount it before the protected routers, but do not
//    apply it to the webhook. For example: app.use('/api/v1', requireAuth).
//    The routers then add their role checks.

app.use('/api/v1/invoices', invoicesRouter);
app.use('/api/v1/invoices', invoicePaymentsRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/jobs', jobsRouter);

// Existing notFound and errorHandler must remain last.
```

The two invoice routers can be mounted in either order; their method/path pairs do not overlap.

## Required server.js integration

```js
import { startScheduler, stopScheduler } from './jobs/scheduler.js';

const server = app.listen(env.PORT, () => console.log(`API listening on ${env.PORT}`));
await startScheduler(); // no-op unless JOBS_ENABLED=true

async function shutdown() {
  stopScheduler();
  server.close(() => prisma.$disconnect().finally(() => process.exit(0)));
}
```

Start the scheduler in one process only. `recoverStaleOutbox()` resets all `PROCESSING` rows at startup, so two app instances starting together can duplicate in-flight email work.

## Environment

Required by existing config: `DATABASE_URL`.

SMTP (all optional; delivery stays off until enabled):

```dotenv
EMAIL_DELIVERY_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_TIMEOUT_MS=20000
```

Use a Gmail app password, not the account password. Port 465 uses implicit TLS; any other port uses STARTTLS. `SMTP_FROM` should normally be the same mailbox as `SMTP_USER`.

Razorpay:

```dotenv
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

Webhook URL: `POST /api/v1/webhooks/razorpay`. Subscribe at least to `payment.captured` and `payment.failed`.

Jobs and reports:

```dotenv
JOBS_ENABLED=false
BILLING_JOB_INTERVAL_MS=900000
EMAIL_JOB_INTERVAL_MS=60000
QUARTERLY_JOB_INTERVAL_MS=86400000
REPORT_RECIPIENTS=
```

`REPORT_RECIPIENTS` is a comma-separated list. Invalid addresses are ignored. Report delivery still requires `EMAIL_DELIVERY_ENABLED=true`.

## Database and migrations

No schema or migration changes were made. Run on a fresh database:

```powershell
npm ci
npm run prisma:generate -w @brightloop/api
# after DATABASE_URL is configured:
npm run prisma:deploy -w @brightloop/api
npm run seed -w @brightloop/api
```

The billing module updates `Invoice.balance` and `Invoice.status` together with inserts into `Payment`, `PaymentStatusLog` and `InvoiceStatusLog`. Do not run billing or payment tests against a shared production database.

## Tests and checks

Run:

```powershell
npm run test -w @brightloop/api
```

The `pretest` step generates Prisma Client. Current result: **27 passing, 0 failing**. No database is needed for these unit tests.

Static checks used:

```powershell
Get-ChildItem -Recurse -File -Path apps/api/src -Filter *.js |
  ForEach-Object { node --check $_.FullName }
```

All new modules were also imported with a dummy `DATABASE_URL` to catch missing exports; all imports resolved.

## Manual smoke test after mounting

1. Start the API with a migrated/seeded database and `JOBS_ENABLED=false`.
2. Authenticate as Admin and confirm a generated draft: `POST /api/v1/invoices/:id/confirm`.
3. Confirm `emailQueued` and an `EmailOutbox` row with status `PENDING`.
4. Set `EMAIL_DELIVERY_ENABLED=true` plus SMTP values and run `POST /api/v1/jobs/email/run`.
5. Check the invoice becomes `SENT` only when it was `CONFIRMED` and SMTP accepted the message.
6. Create a Razorpay order, pay in test mode, then verify the webhook or call `/payments/razorpay/verify`. Check for exactly one confirmed payment and the expected balance/status.
7. Run `POST /api/v1/jobs/billing/run` and inspect generated invoices, periods and discount usage.
8. Check dashboard, Kanban and quarterly endpoints with each role.

## Key files

- `apps/api/src/services/billing-calendar.js`, `pricing.js`, `money.js` — shared calculations.
- `apps/api/src/services/billing.js` — recurring invoice generation.
- `apps/api/src/services/invoices.js`, `payments.js`, `payment-rules.js` — invoice and payment lifecycle.
- `apps/api/src/services/razorpay.js`, `razorpay-signature.js` — provider flows.
- `apps/api/src/services/email.js` — outbox, SMTP and templates.
- `apps/api/src/services/reports.js`, `reporting-rules.js`, `quarterly-reports.js` — reporting.
- `apps/api/src/modules/{invoices,payments,webhooks,reports,jobs}` — exported routers.
- `apps/api/src/jobs/scheduler.js` — scheduler.
- `apps/api/test/*.test.js` — unit tests.
