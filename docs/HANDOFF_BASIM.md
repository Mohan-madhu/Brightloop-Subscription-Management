# Basim Frontend Handoff

## Branch and Commits

- Branch: `Basim/frontend` (the existing branch name; left unchanged).
- Shared exports: `a7079f1 feat(web): publish shared frontend primitives`.
- No auth, Admin, or Marketing feature routes were added because their endpoint contracts are absent.

## Routes

- `/` remains the Phase 0 foundation screen.
- Signup, activation, login, logout, forgot/reset password routes: blocked pending Mohan's auth/session contract.
- Admin staff, catalog, plans, tax, and discount routes: blocked pending the corresponding API contract.
- Marketing assigned-customer, quotation, and subscription routes: blocked pending the corresponding API contract.
- Finance and Customer routes remain Najid's ownership and were not edited.

## Shared Exports

- UI: `Button`, `Input`, `Select`, `FormField`, `Table`, `TableColumn`, `Pagination`, `Badge`, `Dialog`, `LoadingState`, `EmptyState`, and `ErrorState` from `apps/web/components/shared/ui`.
- Shell: `AppShell` and `AppNavigationItem` from `apps/web/components/shared/app-shell`.
- API: `apiRequest`, `apiListRequest`, `ApiClientError`, and request/response types from `apps/web/lib/api`.
- Session: `SessionProvider`, `useSession`, `SessionUser`, and adapter/context types from `apps/web/lib/session`.
- Usage and coordination notes: `docs/FRONTEND_SHARED.md`.

The API client includes cookies, disables caching, returns the standard `data` payload, and supports caller-supplied CSRF token/header values without choosing the backend convention. The session provider requires `getSession` and `logout` adapters. It stores session state in memory and distinguishes loading, unauthenticated, and error states. The shell's role-filtered navigation is presentation only.

## Verified

- `npm run typecheck -w @brightloop/web`: passed after shared exports were added.
- No auth form, API failure-state, responsive browser, or end-to-end business flow was tested; those feature routes do not exist yet.
- `npm run lint -w @brightloop/web`: blocked by the installed dependency tree failing to resolve `es-abstract/2024/AddEntriesFromIterable` while loading `eslint-plugin-react`.
- `npm run build -w @brightloop/web`: blocked because the installed `lightningcss` package is missing `lightningcss.darwin-arm64.node`. Next.js also warned it selected `/Users/basimm/package-lock.json` as the workspace root because multiple lockfiles are present.

## Contract Request to Mohan

`docs/IMPLEMENTATION_CONTRACT.md` is not present. The checked-in `docs/openapi.yaml` and mounted Express routers define only health and public company/billing-interval lookups. Please add and commit the planned endpoint contracts before these pages are implemented.

The auth contract needs signup/availability behavior, activation, login/logout/session retrieval, password reset, cookie attributes, CSRF token retrieval/header semantics, validation error details, and role payload shape. Admin contracts need staff/role assignment and CRUD/list/filter/sort/archive semantics for products, attributes, variants, plans, intervals, add-ons, tax, and discounts. Marketing contracts need assigned-customer list/detail/history, quotation-template selection, quotation create/update/status/conversion, and subscription detail/history/lifecycle actions. Include exact paths, methods, request/response schemas, pagination, status codes, and field-level validation errors.

No endpoint URLs, payload shapes, client-side totals, or success states have been invented. The existing lockfile modification was left untouched. No API/server/schema or Finance/Customer files were changed.