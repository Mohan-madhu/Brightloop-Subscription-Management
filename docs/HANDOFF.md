# Database foundation handoff

## Migration

`20261031000000_phase0_foundation` is the initial PostgreSQL migration at `apps/api/prisma/migrations/20261031000000_phase0_foundation/migration.sql`. It was generated locally with Prisma CLI 6.19.3 using `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`; this workflow did not contact a database or require a shadow database. It was deployed to the configured Brightloop PostgreSQL `public` schema after a read-only check confirmed the schema had zero tables and no migration history.

The migration creates the schema enums, tables, foreign keys, unique keys and indexes represented by `apps/api/prisma/schema.prisma`. Review confirmed `DECIMAL(14,2)` money fields, `DECIMAL(5,2)` tax rates, restrictive foreign-key deletion behavior, unique invoice billing periods, provider/event identifiers, and the documented likely-query indexes.

Known schema gaps to resolve in a later approved schema change: nullable composite unique keys do not guarantee a single global tax applicability row in PostgreSQL; variant IDs on template, quotation and subscription lines are not foreign keys; and the existing discount-target model has no explicit subscription/global target relationship. The catalog and billing teams must agree before changing any of these semantics.

## Execution and verification

Passed against the configured PostgreSQL database: `npm run prisma:deploy`; two consecutive `npm run seed` executions; and `prisma migrate status`, which reports the database schema up to date. Repeatable seed counts are four roles, four billing intervals, one company setting and one tax rule. API checks passed for readiness (200), public company (200), billing intervals (200 with Daily/Weekly/Monthly/Yearly), and invalid pagination (structured 400).

Passed locally: `npm exec --workspace @brightloop/api prisma -- --version`; initial migration SQL generation; `DATABASE_URL=<non-secret local placeholder> npm run prisma:validate`; and `npm run prisma:generate`.

The local `.env` files remain absent, so each database command used a process-only environment variable and no credentials were written to disk. Jobs and email delivery remain disabled by default.

For future deployments, set `apps/api/.env` only in the target environment, confirm the target has matching migration history, then run `npm run prisma:deploy`, `npm run seed` if lookup rows are needed, and `npm exec --workspace @brightloop/api prisma -- migrate status`. If a target contains unmatched history, stop for manual baselining rather than overwriting it.

## Shared interfaces

Use `apps/api/prisma/schema.prisma` as the database contract, `apps/api/src/db/prisma.js` for the Prisma client, `apps/api/src/middleware/validate.js` for list pagination, and `apps/api/src/modules/public/routes.js` for the current public response shapes. `docs/API_CONVENTIONS.md` remains the HTTP response contract. Business modules, payments, scheduled reports, delivery and offline synchronization are not implemented.
