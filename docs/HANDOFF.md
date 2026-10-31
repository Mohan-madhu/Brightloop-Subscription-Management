# Database foundation handoff

## Migration

`20261031000000_phase0_foundation` is the initial PostgreSQL migration at `apps/api/prisma/migrations/20261031000000_phase0_foundation/migration.sql`. It was generated locally with Prisma CLI 6.19.3 using `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`; this workflow did not contact a database or require a shadow database. It has not been applied.

The migration creates the schema enums, tables, foreign keys, unique keys and indexes represented by `apps/api/prisma/schema.prisma`. Review confirmed `DECIMAL(14,2)` money fields, `DECIMAL(5,2)` tax rates, restrictive foreign-key deletion behavior, unique invoice billing periods, provider/event identifiers, and the documented likely-query indexes.

Known schema gaps to resolve in a later approved schema change: nullable composite unique keys do not guarantee a single global tax applicability row in PostgreSQL; variant IDs on template, quotation and subscription lines are not foreign keys; and the existing discount-target model has no explicit subscription/global target relationship. The catalog and billing teams must agree before changing any of these semantics.

## Execution and verification

Passed locally: `npm exec --workspace @brightloop/api prisma -- --version`; initial migration SQL generation; `DATABASE_URL=<non-secret local placeholder> npm run prisma:validate`; and `npm run prisma:generate`.

Unrun: `prisma migrate status`, `npm run prisma:deploy`, both seed runs, readiness/public endpoint checks against PostgreSQL, and database migration-history verification. No `apps/api/.env` or root `.env` is present locally, so no database target was available and no deployment/seed was attempted. Jobs and email delivery remain disabled by default.

To finish safely, Mohan must set `apps/api/.env` with the intended Brightloop `DATABASE_URL`, confirm the target has no untracked tables/data or existing unmatched migration history, then run `npm run prisma:deploy`, `npm run seed` twice, and `npm exec --workspace @brightloop/api prisma -- migrate status`. If the target contains unmatched history, stop for manual baselining rather than overwriting it.

## Shared interfaces

Use `apps/api/prisma/schema.prisma` as the database contract, `apps/api/src/db/prisma.js` for the Prisma client, `apps/api/src/middleware/validate.js` for list pagination, and `apps/api/src/modules/public/routes.js` for the current public response shapes. `docs/API_CONVENTIONS.md` remains the HTTP response contract. Business modules, payments, scheduled reports, delivery and offline synchronization are not implemented.
