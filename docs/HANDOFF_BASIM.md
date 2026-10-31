# Basim Frontend Handoff

## Routes Implemented

- Auth: `/signup`, `/activate`, `/login`, `/forgot-password`, `/password-reset`; session restoration via `/auth/me`, logout via `/auth/logout`.
- Admin: `/admin`, `/admin/staff`, `/admin/products`, `/admin/plans`, `/admin/taxes`, `/admin/discounts`.
- Marketing: `/marketing/customers`, `/marketing/customers/[customerId]`, `/marketing/quotations/[quotationId]`, `/marketing/subscriptions/[subscriptionId]`.
- Shared exports remain documented in `docs/FRONTEND_SHARED.md`. Finance/Customer feature files remain Najid-owned and were not edited.

## PASS

- Published `origin/integration/mvp` was merged without unresolved conflicts. Its newly introduced `apps/api/.env` was excluded from the merge result; the path remains in the already-published ancestor history and credentials must be rotated/removed by the repository owner.
- `npm run typecheck -w @brightloop/web`: passed after route integration and final form guards.
- Isolated API-client test passed for `bl_csrf` decoding, mutation `X-CSRF-Token`, credentials, `{data}` unwrapping, and 401 mapping. It used mocked fetch only.
- Forms use the actual backend methods/paths and decimal string fields. Session identity projects only `userId`, `kind`, `roles`, and `customerId`; guarded routes redirect unauthenticated users to login and restrict role navigation.
- Mutations prevent duplicate submissions and refresh affected API reads. Validation details are shown when the API returns field paths.

## FAIL

- `npm run lint -w @brightloop/web`: ESLint cannot load `es-abstract/2024/AddEntriesFromIterable` through the installed `eslint-plugin-react` dependency tree.
- `npm run build -w @brightloop/web`: Tailwind compilation cannot load `lightningcss.darwin-arm64.node`. Next.js also warns it selected `/Users/basimm/package-lock.json` as workspace root because multiple lockfiles exist.

## NOT RUN

- API `GET /api/v1/health/live` at localhost:4000 and web GET at localhost:3000 both returned connection failure (HTTP 000). Authenticated API/browser smoke tests were therefore not run; no demo fixture or safe test DB was confirmed.
- Signup, activation email delivery, staff activation, Admin mutations, quotations, conversion, subscription lifecycle, dashboard, invoice, billing duplicate-run and payment flows were not executed live. No email, database mutation, billing job, invoice, or payment was triggered.
- Desktop/mobile browser checks were not run because the web runtime could not build/start.

## Backend Mismatches and Blockers

- **Quotation templates:** the contract marks `GET/POST/PATCH /quotation-templates` planned, and no route exists. Marketing UI accepts editable lines and creates a quotation using `POST /api/v1/quotations`; template selection remains unavailable.
- **Quotation totals/history:** `POST /api/v1/quotations` stores caller-supplied line `unitPrice` strings; `GET /api/v1/quotations/:id` returns lines/status but no server-calculated total or status logs. The UI shows no calculated total and does not fabricate history.
- **Customer subscription history:** `GET /api/v1/customers/:id` returns customer/user/assignments only; no customer-scoped subscription list route exists. A subscription can be opened from conversion output, but a full history list is unavailable.
- **Plan intervals:** `GET /api/v1/public/billing-intervals` returns code/name/unit/count, not the interval ID required by plan writes. `GET /api/v1/catalog/plans` reveals IDs only when plans already exist. With no existing plan, plan creation is disabled until an interval-ID listing/admin contract exists.
- **Catalog pagination:** `GET /api/v1/catalog/plans`, `/taxes`, and `/discounts` return plain arrays, contrary to the contract's paginated-list convention. The UI consumes these actual arrays and labels the limitation.
- **Tax applicability:** `POST/PATCH /api/v1/catalog/taxes` accepts name/rate/taxExclusive/active only; it has no target mapping fields despite schema applicability models.
- **Variant methods:** contract marks variant writes planned at `POST/PATCH /catalog/products/:id/variants/:variantId?`; Mohan's handoff calls them implemented; actual `apps/api/src/modules/catalog/routes.js` exposes only `POST /catalog/products/:id/variants`. Variant creation works contractually; edit/read endpoints are absent.
- **Staff status:** the contract says staff creation is planned, but the integrated API mounts `POST /api/v1/staff` and accepts email, firstName, optional lastName, password and roles limited to `MARKETING`/`FINANCE`. UI uses that implemented route. No staff list/edit/role-update endpoint exists.
- **Next-period changes:** no subscription line quantity/add-on mutation endpoint or effective-date response exists. The detail page explains this and offers no unsupported mutation.
- **Lifecycle permissions/effective boundary:** `/api/v1/subscriptions/:id/actions` accepts ACTIVATE/PAUSE/RESUME/CLOSE and returns a subscription, but no effective-at date is returned. The UI follows plan flags and current status; server remains authoritative.

Integration merge: `05c6e66`. The pre-existing `package-lock.json` edit was restored after the merge and remains uncommitted; its named stash backup is retained. No backend implementation or schema was authored in this pass.