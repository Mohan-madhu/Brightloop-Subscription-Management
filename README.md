# Brightloop Subscription Management System

Enterprise-grade subscription management and recurring billing application for Brightloop Software.

## Features

- **Products, Variants & Subscription Plans**: Full catalog management with variant price adjustments, add-ons, and daily/weekly/monthly/yearly recurring intervals.
- **Centralized Pricing Engine**: Precise decimal calculations, 18% base GST/tax calculations (tax-exclusive), and single eligible discount reservations.
- **Quotations Lifecycle**: Quotation templates, quotation creation, validity management, and conversion into linked subscriptions.
- **Subscription Lifecycle**: Draft → Quotation → Confirmed → Active → Paused → Closed, with automated billing boundaries and pause/resume policies.
- **Recurring Billing Engine**: Due subscription processor, idempotent invoice generation with immutable historical financial snapshots, and duplicate billing protection.
- **Invoice & Balance Management**: Invoices with status (Draft → Confirmed → Paid/Cancelled), partial payments, and overdue tracking.
- **Payments & Gateway**: Manual payment tracking and Razorpay test-mode integration with server-side HMAC SHA256 signature verification and webhook idempotency.
- **Role-Based Access Control**:
  - **Admin**: Full administrative oversight (Staff, Catalog, Settings, Taxes, Discounts).
  - **Finance**: Customer billing, invoice confirmation, payments, outstanding balances, Kanban, quarterly reporting.
  - **Marketing**: Assigned customer management, quotations, subscription initiation.
  - **Customer**: Dedicated self-service customer portal with subscription overview, invoice history, and Razorpay checkout.
- **Progressive Web App (PWA) & Offline**: Offline quotation draft storage with seamless background synchronization upon reconnection.
- **Financial Analytics & Reporting**: Real database-driven metrics, revenue vs. collected cash breakdown, overdue aging Kanban, and quarterly financial reports.

## Project Structure

```text
apps/
  web/                  # Next.js 14/15 Frontend (TypeScript, Tailwind CSS, Lucide)
  api/                  # Express.js REST API (ES Modules, Prisma ORM, PostgreSQL/SQLite)
    prisma/             # Database schema, migrations, seed script
    src/
      config/           # Environment & database configuration
      controllers/      # Request handlers for auth, catalog, billing, reports
      middleware/       # Auth, role-based authorization, rate limiting, error handling
      routes/           # Express API v1 route definitions
      services/         # Core business logic: pricing, billing engine, razorpay, email
      utils/            # Password hashing (Argon2/Bcrypt), token generators, date utils
docs/                   # Architecture, API contracts, database, and workflow documentation
```

## Quick Start

### 1. Prerequisites
- Node.js (v18+)
- npm or pnpm
- PostgreSQL (or local SQLite for lightweight verification)

### 2. Environment Setup
Copy the template `.env.example` to `apps/api/.env` and `apps/web/.env.local`:
```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup & Seed
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 5. Start Development Servers
```bash
# Start backend API (Port 5000)
npm run dev:api

# Start frontend application (Port 3000)
npm run dev:web
```

## Team Workflow & Ownership
- **Mohan**: Core Backend, Database, Authentication, Catalog & Subscriptions.
- **Vijay**: Billing Engine, Payments, Razorpay, Notifications & Reporting.
- **Basim**: Shared Frontend, Design System, Admin & Marketing UI.
- **Najid**: Finance Dashboard, Customer Portal, Offline Quotation PWA.
