# Shared Frontend Exports

Import shared UI from `apps/web/components/shared/ui`:

- `Button`, `Input`, `Select`, `FormField`
- `Table` and `TableColumn<Row>`
- `Pagination`, `Badge`, `Dialog`
- `LoadingState`, `EmptyState`, `ErrorState`

Import `AppShell` and `AppNavigationItem` from `apps/web/components/shared/app-shell`. Navigation items can declare allowed `roles`; this only controls visibility and is not authorization. Pass the authenticated user and a server-backed logout callback when those contracts are available.

Import `apiRequest`, `apiListRequest`, `ApiClientError`, and the `ApiSuccessResponse`, `ApiListResponse`, `ApiPagination`, `ApiRequestOptions`, and `ApiErrorResponse` types from `apps/web/lib/api`. Requests include cookies, disable caching, unwrap the standard `data` response envelope, and surface server errors. Mutations echo the readable `bl_csrf` cookie as `X-CSRF-Token`; `csrf: { token, headerName }` remains available for an explicit contract-defined override. No token is stored in browser storage.

Import `SessionProvider`, `useSession`, `apiSessionAdapter`, `SessionUser`, `SessionAdapter`, `SessionStatus`, and `SessionContextValue` from `apps/web/lib/session`. `apiSessionAdapter` maps `GET /auth/me` and `POST /auth/logout`; it treats 401 as unauthenticated and propagates other failures. The provider keeps session state in memory only and distinguishes loading, unauthenticated, and request-error states. Supply the adapter directly or provide an adapter that extends it when login response details such as email are needed.

Example list usage:

```tsx
const result = await apiListRequest<Product>('/contract-defined-path?page=1&pageSize=20');
setRows(result.data);
setPagination(result.pagination);
```

Do not add product or authentication endpoint paths to shared exports without the corresponding checked-in contract. Coordinate interface changes with both frontend owners.