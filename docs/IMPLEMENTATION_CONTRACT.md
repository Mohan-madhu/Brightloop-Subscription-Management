# IMPLEMENTATION CONTRACT — BRIGHTLOOP SUBSCRIPTION MANAGEMENT SYSTEM

**Document Version:** 1.0.0  
**Status:** Canonical & Enforced  
**Authors:** Mohan (Core Backend), Vijay (Billing/Payments), Basim (Admin/Marketing Frontend), Najid (Finance/Customer Frontend)

---

## 1. Domain Entities & Responsibilities

| Domain | Owner | Key Models | Primary APIs |
|---|---|---|---|
| **Identity & Access** | Mohan | `User`, `Token` | `/api/v1/auth/*`, `/api/v1/users/*` |
| **Product Catalog** | Mohan | `Product`, `ProductVariant`, `Plan`, `AddOn`, `PlanAddOn`, `Tax`, `Discount` | `/api/v1/products/*`, `/api/v1/plans/*`, `/api/v1/taxes/*`, `/api/v1/discounts/*` |
| **Quotations** | Mohan / Basim | `QuotationTemplate`, `QuotationTemplateLine`, `Quotation`, `QuotationLine` | `/api/v1/quotation-templates/*`, `/api/v1/quotations/*` |
| **Subscriptions** | Mohan | `Subscription`, `SubscriptionLine`, `SubscriptionAddOn` | `/api/v1/subscriptions/*` |
| **Recurring Billing** | Vijay | `Invoice`, `InvoiceLine`, `InvoiceDiscount` | `/api/v1/billing/*`, `/api/v1/invoices/*` |
| **Payments** | Vijay | `Payment`, `WebhookEvent` | `/api/v1/payments/*`, `/api/v1/webhooks/*` |
| **Reporting & Finance**| Vijay / Najid | `QuarterlyReport` | `/api/v1/reports/*` |
| **Customer Portal** | Najid | Self-service consumer views | `/api/v1/customer/*` |

---

## 2. Status Transitions & Lifecycles

### 2.1 Quotation Lifecycle
```
[DRAFT] ---> [SENT] ---> [ACCEPTED] ---> (Generates Linked Subscription)
         \         \
          \         ---> [REJECTED]
           ---> [EXPIRED]
```
- **Rules:**
  - Quotations cannot be accepted past `expiresAt`.
  - Accepting a quotation triggers transactional subscription creation with idempotency (unique constraint on `quotationId`).

### 2.2 Subscription Lifecycle
```
[DRAFT] ---> [QUOTATION] ---> [CONFIRMED] ---> [ACTIVE] <---> [PAUSED]
                                                    \           /
                                                     ---> [CLOSED]
```
- **Rules:**
  - Only `ACTIVE` subscriptions with `nextBillingDate <= NOW()` are billed.
  - Pausing takes effect at the end of the current billing cycle. Paused subscriptions never generate automatic invoices.
  - Resuming calculates a fresh billing interval boundary starting from resumption date or next period.
  - Closing prevents any future renewals or billing.

### 2.3 Invoice Lifecycle
```
[DRAFT] ---> [CONFIRMED] ---> [PAID] (when outstandingAmount == 0)
         \             \
          \             ---> [CANCELLED]
           ---> [CANCELLED]
```
- **Rules:**
  - `DRAFT`: Reserves discount usage.
  - `CONFIRMED`: Consumes discount usage, locks immutable line items and tax snapshot, emits invoice email notification.
  - `CANCELLED`: Releases reserved discount usage.
  - Partial payments update `paidAmount` and `outstandingAmount`. Only transitions to `PAID` when `outstandingAmount <= 0`.

---

## 3. Centralized Pricing Rules
1. **Line Total Calculation:**
   $$\text{Base Line Price} = \text{Product Sales Price} + \text{Variant Price Adjustment} + \sum \text{Selected Add-On Prices}$$
   $$\text{Line Subtotal} = \text{Base Line Price} \times \text{Quantity}$$
2. **Subtotal:**
   $$\text{Subtotal} = \sum \text{Line Subtotals}$$
3. **Discount Allocation:**
   - Maximum 1 eligible discount applied per invoice/quotation.
   - For `FIXED`: $\min(\text{Discount Value}, \text{Subtotal})$.
   - For `PERCENTAGE`: $(\text{Subtotal} \times \text{Discount Value}) / 100$.
4. **Tax Calculation (Tax-Exclusive 18% Base):**
   $$\text{Taxable Amount} = \max(0, \text{Subtotal} - \text{Discount Amount})$$
   $$\text{Tax Amount} = \text{Taxable Amount} \times 0.18 \quad (\text{or configured tax rate})$$
5. **Grand Total:**
   $$\text{Grand Total} = \text{Taxable Amount} + \text{Tax Amount}$$
6. **Precision:**
   - All server calculations retain 2 decimal places with half-up rounding.
   - Server calculations strictly override any frontend estimates.

---

## 4. Role Authorization Matrix

| Action / Resource | ADMIN | FINANCE | MARKETING | CUSTOMER |
|---|---|---|---|---|
| User & Staff Management | Full | None | None | None |
| Customer Profile View/Edit | Full | Read/Billing | Assigned Only | Self Only |
| Catalog, Plans, Taxes, Discounts | Full (CRUD) | Read Only | Read Only | Read (Plans) |
| Quotations | Full | Read Only | Assigned Only | Own Only |
| Subscriptions | Full | Read Only | Assigned Only | Own Only |
| Invoices (View) | Full | Full | Read Assigned | Own Only |
| Invoices (Confirm / Cancel) | Full | Full | None | None |
| Manual Payments | Full | Full | None | None |
| Razorpay Checkout | Test Mode | Test Mode | None | Own Invoices |
| Finance Metrics / Reports | Full | Full | None | None |
