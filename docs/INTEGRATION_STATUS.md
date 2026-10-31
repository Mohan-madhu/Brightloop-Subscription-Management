# Integration MVP status

Integration branch: `integration/mvp`. It starts from current `main` and merges `vijay/backend`; Basim and Najid branches were not available at assembly time.

## PASS

- Vijay invoice, payment, report, job and Razorpay webhook routers are registered.
- The Razorpay raw-body router is mounted before the global JSON parser.
- Shared cookie sessions protect all billing routers; Vijay's role adapter receives the required `req.auth` shape.
- Scheduler starts only when `JOBS_ENABLED=true`; email delivery remains disabled unless explicitly enabled.
- Auth and staff activation/reset messages use the shared transactional outbox interface.
- Prisma validation, frontend typecheck, and Vijay's 27 pure backend tests pass.

## NOT RUN

- End-to-end demo fixture flow, live SMTP, Razorpay checkout/webhook, billing twice, and API timing measurements. No isolated destructive test database or provisioned Admin/demo fixtures are available.

## Blockers

- Basim/Najid branches, handoffs and frontend routes are absent, so frontend API-path integration cannot be verified.
- `Quotation` has no persisted totals, and sales routes do not yet use Vijay's `pricing.js` to derive a quote preview. This must be agreed before a quotation UI claims authoritative totals.
- The schema gaps documented in `HANDOFF_MOHAN.md` remain: global tax/discount target semantics and line-variant foreign keys.

## Demo startup

```powershell
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run seed
npm run dev
```

Use `JOBS_ENABLED=false` and `EMAIL_DELIVERY_ENABLED=false` for ordinary integration. Enable either only with dedicated demo fixtures and one designated process.
