# Shared Frontend Exports

Import shared UI from `apps/web/components/shared/ui`:

- `Button`, `Input`, `Select`, `FormField`
- `Table` and `TableColumn<Row>`
- `Pagination`, `Badge`, `Dialog`
- `LoadingState`, `EmptyState`, `ErrorState`

Import `AppShell` and `AppNavigationItem` from `apps/web/components/shared/app-shell`. Navigation items can declare allowed `roles`; this only controls visibility and is not authorization. Pass the authenticated user and a server-backed logout callback when those contracts are available.

Import `apiRequest`, `apiListRequest`, `ApiClientError`, and the `ApiSuccessResponse`, `ApiListResponse`, `ApiPagination`, `ApiRequestOptions`, and `ApiErrorResponse` types from `apps/web/lib/api`. Requests include cookies, disable caching, unwrap the standard `data` response envelope, and surface server errors. Pass `csrf: { token, headerName }` only after the backend contract defines both values. No token is stored by the client.

Import `SessionProvider`, `useSession`, `SessionUser`, `SessionAdapter`, `SessionStatus`, and `SessionContextValue` from `apps/web/lib/session`. The provider requires `getSession` and `logout` adapters, so route paths and payload mapping remain owned by the agreed API contract. It keeps session state in memory only and distinguishes loading, unauthenticated, and request-error states.

Example list usage:

```tsx
const result = await apiListRequest<Product>('/contract-defined-path?page=1&pageSize=20');
setRows(result.data);
setPagination(result.pagination);
```

Do not add product or authentication endpoint paths to shared exports without the corresponding checked-in contract. Coordinate interface changes with both frontend owners.