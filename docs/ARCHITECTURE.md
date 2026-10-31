# Architecture

`apps/web` is a strict-TypeScript Next.js application. `apps/api` is an ESM JavaScript Express modular monolith. The browser calls Express at `/api` in production through a reverse proxy; Express alone uses Prisma to access PostgreSQL. No browser code contains database or integration secrets.

The API runs separately from Next.js. A future designated worker may run scheduled work only when `JOBS_ENABLED=true`; developers and ordinary web instances leave it false. Postgres remains the source of truth and database constraints protect retries and concurrency.

`src/modules` holds feature routes, `src/services` will hold use-cases, `src/db` owns Prisma, and `src/middleware` owns shared HTTP concerns. Timestamps are stored UTC; billing calculations use Asia/Kolkata.
