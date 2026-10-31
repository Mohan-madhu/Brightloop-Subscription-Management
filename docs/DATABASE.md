# DATABASE ARCHITECTURE & SCHEMA SPECIFICATION

The Brightloop database model relies on relational constraints, foreign keys, unique indexes, and ACID transactions to ensure financial data integrity.

## Entity Relationship Overview

```
User (ADMIN, FINANCE, MARKETING, CUSTOMER)
 |
 +--> Token (ACTIVATION, RESET)
 |
 +--> Customer Quotations
 |     |
 |     +--> QuotationLine --> Product, ProductVariant, Plan
 |     +--> QuotationAddOn --> AddOn
 |
 +--> Customer Subscriptions
 |     |
 |     +--> SubscriptionLine --> Product, ProductVariant
 |     +--> SubscriptionAddOn --> AddOn
 |     |
 |     +--> Invoices (1-to-N per billing period)
 |           |
 |           +--> InvoiceLine (Immutable snapshot)
 |           +--> InvoiceDiscount (Usage reservation)
 |           +--> Payments (Manual / Razorpay)
 |
Product
 |
 +--> ProductVariant (price adjustments)
 +--> Plan (DAILY, WEEKLY, MONTHLY, YEARLY)
 +--> PlanAddOn --> AddOn

Tax (Configurable tax rates, default 18% GST)
Discount (Fixed / Percentage with usage caps and limits)
QuarterlyReport (Historical financial reporting periods)
WebhookEvent (Idempotency log for payment gateways)
```

## Key Relational Rules & Integrity Guarantees

1. **Email Normalization**: `User.email` is stored in lowercase with a `UNIQUE` constraint.
2. **Subscription Idempotency**: `Subscription.subscriptionNumber` is unique. Quotation conversion is guarded by `Quotation.id` linking to at most 1 subscription.
3. **Billing Period Idempotency**: `Invoice` has unique billing period boundaries for each subscription (`subscriptionId`, `billingPeriodStart`, `billingPeriodEnd`), preventing duplicate invoice generation.
4. **Historical Snapshots**: `InvoiceLine` stores explicit `unitPrice`, `quantity`, `subtotal`, `taxRate`, and `taxAmount` at the moment of invoice issuance, insulating historical balances from catalog modifications.
5. **Precise Monies**: All currency amounts are stored in decimal columns with precision 12, scale 2 (or equivalent numeric types). Floating-point math is strictly forbidden.
