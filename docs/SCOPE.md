# SCOPE & ROADMAP

## Core In-Scope Deliverables
1. **Multi-Role Authentication & RBAC**: Admin, Finance, Marketing, Customer accounts with email activation and password reset tokens.
2. **Product Catalog & Pricing Engine**: Products, Variants, Plans, Add-ons, 18% base tax, and Discounts with usage tracking.
3. **Quotation & Subscription Management**: Quotation templates, customer quotation workflow, accepted quotation conversion into active subscriptions.
4. **Recurring Billing Engine**: Due subscription processor supporting Daily, Weekly, Monthly, and Yearly intervals with duplicate invoice prevention.
5. **Invoice Management & Invoicing Snapshots**: Draft, Confirmed, Paid, and Cancelled states with immutable line snapshots.
6. **Payments Integration**: Manual partial and full payments, plus Razorpay test mode integration with HMAC verification and webhook idempotency.
7. **Finance Dashboard & Reporting**: Database-driven revenue analytics, collected cash, outstanding balances, due-date Kanban, and quarterly reports.
8. **Customer Self-Service Portal**: Subscription listing, invoice viewer, and integrated Razorpay payment checkout.
9. **Progressive Web App (PWA) & Offline Sync**: Service worker, offline quotation draft preservation, and background synchronization upon reconnect.

## Explicitly Out of Scope / Deferred
- WhatsApp notifications (deferred to subsequent releases).
- IVR telephony integration (deferred).
- Multi-currency support (INR ₹ only for this phase).
- Third-party accounting sync (Tally/QuickBooks).
