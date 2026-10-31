# Vijay UI/UX integration

## Applied

- Preserved the current `main` API, Prisma schema, session-cookie/CSRF auth, billing and Razorpay contracts.
- Updated the active shared application shell to use Vijay's dark navigation and emerald action language.
- Added online/offline status indicators to the shared shell.
- Added an authenticated local offline-drafts workspace at `/offline-drafts`.
- Added compatibility routes for Vijay's expected `/dashboard`, `/register`, `/customer/invoices`, and `/customer/subscriptions` paths without changing backend behavior.
- Added offline-drafts navigation for admin, finance, customer and marketing workspaces.

## Deliberately not merged

Vijay's alternate controllers, routes, services, Prisma schema, auth context, API client, package files and lockfile were not merged. They have no common history with the production `main` architecture and use different endpoint, token and response contracts.

The remaining Vijay screens can be ported incrementally by adapting their presentation to the current `apps/web/app/**` routes and `apps/web/lib/api.ts`; no backend replacement is required.

## Verification

- `npm run typecheck -w @brightloop/web` — PASS
- `npm run build -w @brightloop/web` — compile and route generation PASS
- Existing ESLint parser dependency warning remains in the workspace; no source lint failure was introduced.
