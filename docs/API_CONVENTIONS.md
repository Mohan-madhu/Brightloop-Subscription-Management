# API CONVENTIONS & SPECIFICATION

## Base URL
All API requests are scoped under `/api/v1`.

## Headers
- `Content-Type: application/json`
- `Authorization: Bearer <JWT_TOKEN>` (for authenticated endpoints)

## Standard Response Envelopes

### 1. Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Resource retrieved successfully"
}
```

### 2. Paginated Success Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalCount": 42,
    "totalPages": 5
  }
}
```

### 3. Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid credentials or request data",
    "details": [ ... ]
  }
}
```

## HTTP Status Codes
- `200 OK`: Successful retrieval or mutation.
- `201 Created`: Resource created.
- `400 Bad Request`: Validation failure or business rule violation.
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Authenticated user lacks authorization for the resource.
- `404 Not Found`: Target entity not found.
- `409 Conflict`: Conflict, e.g. duplicate key or duplicate billing period.
- `500 Internal Server Error`: Unexpected server exception.
