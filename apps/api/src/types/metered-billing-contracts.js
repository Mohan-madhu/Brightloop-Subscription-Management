/**
 * Metered & Consumption-Based Billing Contract Schemas (Zod).
 *
 * Defines runtime validation contracts for usage event ingestion, pricing models,
 * and aggregated invoice line rating.
 */

import { z } from 'zod';

export const PricingModelSchema = z.enum(['GRADUATED', 'VOLUME', 'OVERAGE', 'PER_UNIT']);
export const AggregationModeSchema = z.enum(['SUM', 'MAX', 'LAST_DURING_PERIOD']);

export const UsageTierBracketSchema = z.object({
  upTo: z.number().int().positive().nullable(),
  unitPrice: z.string().regex(/^\d+\.\d{2}$/, 'Price must be in fixed decimal format (e.g. "0.05")')
});

export const MeteredMetricConfigSchema = z.object({
  metric: z.string().min(2).max(50),
  displayName: z.string().min(2).max(100),
  pricingModel: PricingModelSchema,
  aggregationMode: AggregationModeSchema,
  baseAllowance: z.number().int().nonnegative().default(0),
  tiers: z.array(UsageTierBracketSchema).min(1)
});

export const UsageEventRecordSchema = z.object({
  id: z.string().regex(/^use_[A-Za-z0-9_-]+$/),
  subscriptionId: z.string().min(1),
  customerId: z.string().min(1),
  metric: z.string().min(2),
  quantity: z.number().int().positive(),
  timestamp: z.string().datetime(),
  idempotencyKey: z.string().min(8).max(128)
});

export const UsageIngestBatchRequestSchema = z.object({
  batchId: z.string().min(1),
  events: z.array(UsageEventRecordSchema).min(1).max(500)
});

export const MeteredInvoiceLineSchema = z.object({
  metric: z.string(),
  description: z.string(),
  pricingModel: PricingModelSchema,
  totalUnitsConsumed: z.number().int().nonnegative(),
  chargeableUnits: z.number().int().nonnegative(),
  unitPrice: z.string().regex(/^\d+\.\d{2}$/),
  totalCost: z.string().regex(/^\d+\.\d{2}$/),
  currency: z.string().default('INR')
});

/**
 * Validates a single usage event record.
 */
export function validateUsageEvent(payload) {
  return UsageEventRecordSchema.safeParse(payload);
}

/**
 * Validates a batch of usage ingestion events.
 */
export function validateUsageBatch(payload) {
  return UsageIngestBatchRequestSchema.safeParse(payload);
}

/**
 * Validates a metered invoice line item.
 */
export function validateMeteredInvoiceLine(payload) {
  return MeteredInvoiceLineSchema.safeParse(payload);
}
