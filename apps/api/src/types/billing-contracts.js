/**
 * Brightloop Authoritative Billing & Payment Contract Specifications
 * 
 * Formal contract interfaces and runtime schema validators for all billing,
 * invoice, payment, report, and webhook payloads. Ensures strict schema alignment
 * between Mohan's database integration and Najid's frontend presentation views.
 */

import { z } from 'zod';

export const MoneyStringSchema = z
  .string()
  .regex(/^\d{1,12}\.\d{2}$/, 'Money values must be formatted as decimal strings with exactly two fraction digits.');

export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date strings must adhere to YYYY-MM-DD format.');

export const CurrencyCodeSchema = z.literal('INR');

export const InvoiceStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELLED'
]);

export const PaymentStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'FAILED',
  'VOID'
]);

export const PaymentMethodSchema = z.enum([
  'CASH',
  'BANK_TRANSFER',
  'UPI',
  'CHEQUE',
  'CARD',
  'OTHER',
  'RAZORPAY_CARD',
  'RAZORPAY_UPI',
  'RAZORPAY_NETBANKING',
  'RAZORPAY_WALLET',
  'RAZORPAY_UNKNOWN'
]);

export const InvoiceTaxLineSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  rate: MoneyStringSchema,
  amount: MoneyStringSchema
});

export const InvoiceLineSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: MoneyStringSchema,
  discountAmount: MoneyStringSchema,
  lineTotal: MoneyStringSchema,
  snapshot: z.record(z.unknown()).optional().nullable(),
  taxes: z.array(InvoiceTaxLineSchema)
});

export const StatusLogSchema = z.object({
  id: z.string().optional(),
  status: z.string(),
  note: z.string().nullable().optional(),
  createdAt: z.string().datetime().or(z.string())
});

export const InvoicePaymentSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  method: z.string(),
  amount: MoneyStringSchema,
  paidAt: z.string(),
  note: z.string().nullable().optional(),
  providerPaymentId: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  status: PaymentStatusSchema,
  createdAt: z.string(),
  logs: z.array(StatusLogSchema).optional()
});

export const InvoiceSummaryContractSchema = z.object({
  id: z.string(),
  number: z.string(),
  customerId: z.string(),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable().optional(),
  issueDate: DateStringSchema.nullable().optional(),
  status: InvoiceStatusSchema,
  overdue: z.boolean(),
  currency: CurrencyCodeSchema,
  dueDate: DateStringSchema.nullable(),
  total: MoneyStringSchema,
  balance: MoneyStringSchema,
  createdAt: z.string(),
  billingPeriod: z
    .object({
      id: z.string(),
      startsAt: DateStringSchema.nullable(),
      endsAt: DateStringSchema.nullable(),
      subscriptionId: z.string()
    })
    .nullable()
    .optional()
});

export const InvoiceDetailContractSchema = InvoiceSummaryContractSchema.extend({
  customerAddress: z.string().nullable().optional(),
  customerSnapshot: z.record(z.unknown()).optional().nullable(),
  discountSnapshot: z.record(z.unknown()).optional().nullable(),
  subtotal: MoneyStringSchema,
  discountTotal: MoneyStringSchema,
  taxTotal: MoneyStringSchema,
  version: z.number().int().default(1),
  updatedAt: z.string(),
  lines: z.array(InvoiceLineSchema),
  logs: z.array(StatusLogSchema),
  history: z
    .array(
      z.object({
        status: z.string(),
        at: z.string(),
        note: z.string().nullable().optional()
      })
    )
    .optional(),
  payments: z.array(InvoicePaymentSchema),
  orders: z.array(
    z.object({
      id: z.string(),
      provider: z.string(),
      providerOrderId: z.string(),
      amount: MoneyStringSchema,
      currency: CurrencyCodeSchema,
      createdAt: z.string()
    })
  ).optional()
});

export const DashboardContractSchema = z.object({
  range: z.object({
    from: DateStringSchema,
    to: DateStringSchema
  }),
  activeSubscriptions: z.number().int().nonnegative(),
  invoiced: MoneyStringSchema,
  invoicedAmount: MoneyStringSchema,
  invoicedInvoiceCount: z.number().int().nonnegative(),
  collected: MoneyStringSchema,
  collectedAmount: MoneyStringSchema,
  collectedPaymentCount: z.number().int().nonnegative(),
  outstanding: MoneyStringSchema,
  outstandingBalance: MoneyStringSchema,
  outstandingInvoiceCount: z.number().int().nonnegative(),
  overdueCount: z.number().int().nonnegative(),
  overdueBalance: MoneyStringSchema,
  overdueInvoiceCount: z.number().int().nonnegative(),
  currency: CurrencyCodeSchema,
  invoiceCount: z.number().int().nonnegative(),
  paidInvoiceCount: z.number().int().nonnegative()
});

export const KanbanBucketContractSchema = z.object({
  key: z.string(),
  bucket: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
  balance: MoneyStringSchema
});

export const QuarterlyReportRunContractSchema = z.object({
  id: z.string(),
  reportType: z.literal('QUARTERLY'),
  periodKey: z.string(),
  period: z.string().optional(),
  status: z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED']),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  downloadAvailable: z.boolean().optional(),
  metadata: z.record(z.unknown()).nullable()
});

export function validateInvoiceSummary(payload) {
  return InvoiceSummaryContractSchema.parse(payload);
}

export function validateInvoiceDetail(payload) {
  return InvoiceDetailContractSchema.parse(payload);
}

export function validateDashboard(payload) {
  return DashboardContractSchema.parse(payload);
}

export function validateKanbanBucket(payload) {
  return KanbanBucketContractSchema.parse(payload);
}

export function validateQuarterlyReportRun(payload) {
  return QuarterlyReportRunContractSchema.parse(payload);
}
