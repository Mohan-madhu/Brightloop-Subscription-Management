# TEAM WORKFLOW & OWNERSHIP

## Team Member Responsibilities
- **Mohan (Core Backend & DB Architect)**
  - Schema design (`schema.prisma`), migrations, seed data.
  - Identity, authentication, tokens, RBAC middleware.
  - Product catalog, variants, plans, taxes, discounts.
  - Quotations & subscription lifecycle services.
- **Vijay (Billing, Payments & Integration)**
  - Centralized pricing calculations.
  - Recurring billing engine & cron scheduler.
  - Invoices and snapshot persistence.
  - Manual payments and Razorpay gateway integration.
  - Finance reports and quarterly generation.
- **Basim (Shared Frontend & Admin/Marketing UI)**
  - Application shell, navigation, design tokens.
  - Shared API client, authentication views.
  - Admin catalog management, staff management.
  - Marketing customer quotation workflows.
- **Najid (Finance & Customer Experience UI)**
  - Finance dashboard, revenue charts, Kanban.
  - Invoice management, payment logging, and print view.
  - Customer self-service portal & Razorpay checkout modal.
  - Offline quotation draft storage and PWA sync.

## Branching & Commit Discipline
- Working Branch: `vijay/demo_prototype`
- Commits are made only when features are verified end-to-end.
- Never force-push or reset shared repositories.
