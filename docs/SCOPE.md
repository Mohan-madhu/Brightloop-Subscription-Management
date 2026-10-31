# Phase 0 scope

Implemented: workspace setup, Express health/public lookup endpoints, Prisma schema and repeatable baseline seed, plus a responsive web shell that reads those endpoints.

Deferred: authentication flows, staff/customer pages, catalog management, quotations, subscriptions, invoice generation, discounts, payments, reports, email delivery, jobs, Razorpay and PWA/offline sync.

The proposed offline boundary is cached authorized viewing and local quotation drafts queued for sync. Confirmation is still required. Financial actions will always need online backend validation.
