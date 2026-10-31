# ARCHITECTURE DOCUMENTATION

## 1. System Overview

Brightloop Subscription Management System is organized as an enterprise modular full-stack application designed for high consistency, accurate financial calculations, and secure role-based access.

```
                    +-----------------------------+
                    |      Browser / Next.js      |
                    | (PWA, React, Tailwind, UI)  |
                    +--------------+--------------+
                                   |
                             HTTPS / JSON
                                   |
                                   v
                    +-----------------------------+
                    |    Express.js REST API      |
                    |        (/api/v1/*)          |
                    +--------------+--------------+
                                   |
         +-------------------------+-------------------------+
         |                         |                         |
         v                         v                         v
+-----------------+       +-----------------+       +-----------------+
| Auth & RBAC     |       | Pricing Service |       | Billing Engine  |
| Middleware      |       | & Taxes (18%)   |       | & Due Processor |
+-----------------+       +-----------------+       +-----------------+
         |                         |                         |
         +-------------------------+-------------------------+
                                   |
                                   v
                    +-----------------------------+
                    |      Prisma ORM Client      |
                    +--------------+--------------+
                                   |
                                   v
                    +-----------------------------+
                    |    PostgreSQL / SQLite      |
                    | (Relational Integrity, Tx)  |
                    +-----------------------------+
```

## 2. Monorepo Organization
- `apps/web`: Next.js 14 App Router, React Server/Client Components, Tailwind CSS v4, Lucide icons, responsive navigation, role-protected dashboard routes.
- `apps/api`: Node.js Express server running ES modules, Prisma Client for database queries, centralized services, route handlers, error handlers, and cron processors.
- `docs/`: Unified documentation, schema definition, API contracts, and OpenAPI 3.0 specification.

## 3. Security Architecture
1. **Password Hashing**: Cryptographic password hashing with minimum 9 chars, uppercase, lowercase, and special characters.
2. **Access Control**: JWT Bearer tokens and HttpOnly session cookies. Role-Based Access Control (RBAC) middleware verifying token authenticity, user status (`ACTIVE`), and role authorizations on every protected endpoint.
3. **Data Isolation**: Customers can only view and mutate their own subscriptions, invoices, and payment checkout sessions. Marketing staff are constrained to their assigned customers.
4. **Payment Verification**: Razorpay checkout generates order records on the server; callback verification calculates HMAC SHA256 signatures comparing against `RAZORPAY_KEY_SECRET`. Webhook idempotency protects against duplicate webhook replays.
