# Basim Frontend Handoff

## Integration Status

The API client and session adapter were aligned to the integrated auth contract. The local branch was not merged with `origin/main` or `origin/integration/mvp`: those refs track `apps/api/.env`, and this frontend-only pass avoided importing environment credentials or unrelated owner changes. Normal integration remains pending.

Shared exports remain in `apps/web/components/shared/ui.tsx`, `apps/web/components/shared/app-shell.tsx`, `apps/web/lib/api.ts`, and `apps/web/lib/session.tsx`; usage is documented in `docs/FRONTEND_SHARED.md`. No Finance/Customer feature files or backend/schema files were changed.

## PASS

- `npm run typecheck -w @brightloop/web`: passed after the interface fixes.
- Isolated API-client behavior test passed for `bl_csrf` cookie decoding, `X-CSRF-Token` forwarding on POST, `credentials: include`, standard `{data}` unwrapping, and 401 `ApiClientError` mapping. The test used mocked fetch and made no API requests.
- Session adapter uses the actual `GET /api/v1/auth/me` payload (`userId`, `kind`, `roles`, `customerId`), maps 401 to unauthenticated, and calls `POST /api/v1/auth/logout`; logout receives the CSRF header from the readable cookie.

## FAIL

- `npm run lint -w @brightloop/web`: ESLint cannot load `es-abstract/2024/AddEntriesFromIterable` from the installed `eslint-plugin-react` dependency tree.
- `npm run build -w @brightloop/web`: Tailwind compilation fails because the installed `lightningcss` package lacks `lightningcss.darwin-arm64.node`. Next.js also warns it selected `/Users/basimm/package-lock.json` as workspace root due to multiple lockfiles.

## NOT RUN

- Browser desktop/mobile smoke test and real auth/API integration: not run. The current feature branch has no auth, Admin, or Marketing page routes, and no explicitly provisioned disposable demo fixture was provided. No signup email, account mutation, invoice generation, billing job, or payment was triggered.
- Admin setup through updated dashboard and duplicate-billing demonstration: not run; requires integrated frontend routes, a safe demo database/fixture, and the other owners' backend changes.

## Cross-Owner Interface Blockers

- **Variant API status/path:** `docs/IMPLEMENTATION_CONTRACT.md` marks variant writes planned as `POST/PATCH /catalog/products/:id/variants/:variantId?`; `docs/HANDOFF_MOHAN.md` says variant reads/writes are implemented; the integrated `apps/api/src/modules/catalog/routes.js` currently exposes only `POST /api/v1/catalog/products/:id/variants` and no variant PATCH or GET-by-product route. Mohan should reconcile the contract/handoff and publish the supported read/update operations before an Admin variant editor is wired.
- **Catalog list pagination:** the contract says all list routes accept pagination, but `GET /api/v1/catalog/plans`, `/taxes`, and Admin `/discounts` in `apps/api/src/modules/catalog/routes.js` return plain arrays without pagination. Align those endpoints or explicitly document them as bounded, non-paginated lists before list screens depend on `apiListRequest`.
- **Pending assigned scope:** staff creation/role assignment and quotation-template endpoints are explicitly pending in the implementation contract and Mohan handoff. Auth/Admin/Marketing pages are not present in this checkout, so no UI success is claimed.
- **Integration secret:** `apps/api/.env` is tracked on the integrated refs. Remove it from version control and rotate any committed credentials before merging or opening a branch that inherits that history.

No endpoint paths, request schemas, client-side money totals, or success placeholders were invented. The pre-existing `package-lock.json` modification was not staged or changed.