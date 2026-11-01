import { prisma } from '../db/prisma.js';
import { dec, moneyString, roundMoney, sumMoney } from './money.js';
import { calculatePricing, selectDiscount } from './pricing.js';
import {
  dateOnlyFromTz,
  dueDateFor,
  duePeriodsFor,
  formatDateOnly,
  parseDateOnly
} from './billing-calendar.js';

const SUBSCRIPTION_BATCH = 100;
const MAX_CATCH_UP_PERIODS = 520;

function taxAppliesToLine(tax, line, planId) {
  const rules = tax.applicability ?? [];
  if (rules.length === 0) return true;
  return rules.some((rule) => {
    if (rule.productId && rule.productId !== line.productId) return false;
    if (rule.planId && rule.planId !== planId) return false;
    return true;
  });
}

function taxesForLine(taxes, line, planId) {
  return taxes
    .filter((tax) => taxAppliesToLine(tax, line, planId))
    .map((tax) => ({ name: tax.name, rate: dec(tax.rate) }));
}

function lineInputs(subscription, taxes) {
  return subscription.lines
    .map((line) => ({
      key: line.id,
      description: line.description,
      productId: line.productId,
      variantId: line.variantId,
      isAddon: line.isAddon,
      quantity: line.quantity,
      unitPrice: line.agreedPrice,
      taxes: taxesForLine(taxes, line, subscription.planId)
    }))
    .sort((left, right) => String(left.key).localeCompare(String(right.key)));
}

function subtotalFor(lines) {
  return sumMoney(lines.map((line) => roundMoney(dec(line.unitPrice).mul(line.quantity))));
}

function invoiceNumberFor(subscription, period) {
  return `INV-${formatDateOnly(period.startsAt).replaceAll('-', '')}-${subscription.number}`;
}

async function resumeStartFor(tx, subscriptionId) {
  const logs = await tx.subscriptionStatusLog.findMany({
    where: { subscriptionId },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  const pauseIndex = logs.findIndex((log) => log.status === 'PAUSED');
  if (pauseIndex < 0) return null;
  const resumeLog = logs.slice(0, pauseIndex).find((log) => log.status === 'ACTIVE');
  if (!resumeLog) return null;
  const target = resumeLog.effectiveAt ?? resumeLog.createdAt;
  return target instanceof Date ? dateOnlyFromTz(target) : target;
}

async function loadDiscountCandidates(tx, now) {
  return tx.discount.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }
      ]
    },
    include: { targets: true },
    orderBy: { code: 'asc' }
  });
}

/**
 * Locks eligible discount rows in deterministic ID order with SELECT ... FOR UPDATE,
 * and counts non-released usages to prevent concurrency race conditions on discount caps.
 */
async function lockDiscountsAndCountUsage(tx, discounts) {
  const usageCounts = {};
  for (const discount of [...discounts].sort((left, right) => left.id.localeCompare(right.id))) {
    await tx.$queryRaw`SELECT id FROM "Discount" WHERE id = ${discount.id} FOR UPDATE`;
    usageCounts[discount.id] = await tx.discountUsage.count({ where: { discountId: discount.id, releasedAt: null } });
  }
  return usageCounts;
}

function customerSnapshot(subscription) {
  return {
    customerId: subscription.customerId,
    legalName: subscription.customer.legalName,
    billingEmail: subscription.customer.billingEmail,
    billingAddress: subscription.customer.billingAddress ?? null
  };
}

async function createInvoiceForPeriod(tx, { subscription, period, taxes, discounts, now }) {
  const existingPeriod = await tx.billingPeriod.findUnique({
    where: {
      subscriptionId_startsAt_endsAt: {
        subscriptionId: subscription.id,
        startsAt: period.startsAt,
        endsAt: period.endsAt
      }
    },
    select: { id: true }
  });
  if (existingPeriod) return { skipped: 'PERIOD_ALREADY_EXISTS' };

  const lines = lineInputs(subscription, taxes);
  if (lines.length === 0) return { skipped: 'NO_SUBSCRIPTION_LINES' };

  const usageCounts = await lockDiscountsAndCountUsage(tx, discounts);
  const selected = selectDiscount({
    discounts,
    lines,
    subtotal: subtotalFor(lines),
    quantity: lines.reduce((total, line) => total + line.quantity, 0),
    planId: subscription.planId,
    now,
    usageCounts
  });
  const pricing = calculatePricing({
    lines,
    planId: subscription.planId,
    now,
    discount: selected ? { ...selected.discount, usageCount: usageCounts[selected.discount.id] ?? 0 } : null
  });
  const dueAt = dueDateFor(period.startsAt, subscription.paymentTerms);

  const billingPeriod = await tx.billingPeriod.create({
    data: {
      subscriptionId: subscription.id,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      dueAt
    }
  });

  const invoice = await tx.invoice.create({
    data: {
      number: invoiceNumberFor(subscription, period),
      customerId: subscription.customerId,
      billingPeriodId: billingPeriod.id,
      status: 'DRAFT',
      currency: 'INR',
      dueDate: dueAt,
      customerSnapshot: customerSnapshot(subscription),
      subtotal: pricing.subtotal,
      discountTotal: pricing.discountTotal,
      taxTotal: pricing.taxTotal,
      total: pricing.total,
      balance: pricing.total,
      discountSnapshot: pricing.discount
        ? {
            discountId: pricing.discount.id,
            code: pricing.discount.code,
            kind: pricing.discount.kind,
            amount: moneyString(pricing.discount.amount),
            reduction: moneyString(pricing.discount.reduction)
          }
        : undefined,
      lines: {
        create: pricing.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: moneyString(line.unitPrice),
          discountAmount: moneyString(line.discountAmount),
          lineTotal: moneyString(line.lineTotal),
          snapshot: {
            productId: line.productId,
            variantId: line.variantId,
            isAddon: line.isAddon,
            baseAmount: moneyString(line.baseAmount),
            taxTotal: moneyString(line.taxTotal)
          },
          taxes: {
            create: line.taxes.map((tax) => ({
              name: tax.name,
              rate: moneyString(tax.rate),
              amount: moneyString(tax.amount)
            }))
          }
        }))
      },
      logs: { create: { status: 'DRAFT', note: 'Generated by the recurring billing service.' } }
    },
    include: { lines: true }
  });

  if (pricing.discount?.id) {
    await tx.discountUsage.create({
      data: { discountId: pricing.discount.id, invoiceId: invoice.id }
    });
  }

  return { invoice, period: billingPeriod, pricing };
}

/**
 * Executes recurring invoice generation for a subscription within a serializable transaction.
 * Uses PostgreSQL advisory transaction locks to guarantee mutual exclusion per subscription,
 * ensuring parallel scheduler or manual billing attempts do not generate duplicate invoices.
 */
async function billSubscriptionInTransaction(tx, subscriptionId, asOfDate, now) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`brightloop:subscription-billing:${subscriptionId}`}))`;
  const subscription = await tx.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      customer: true,
      plan: { include: { billingInterval: true } },
      lines: { orderBy: { id: 'asc' } },
      periods: { orderBy: { startsAt: 'desc' }, take: 1 }
    }
  });
  if (!subscription) return { skipped: 'NOT_FOUND', invoices: [] };
  if (subscription.status !== 'ACTIVE') return { skipped: `STATUS_${subscription.status}`, invoices: [] };

  const resumeStart = await resumeStartFor(tx, subscription.id);
  const lastEnd = subscription.periods[0]?.endsAt ?? null;
  const { periods, truncated } = duePeriodsFor({
    startDate: subscription.startDate,
    lastEnd,
    expiryDate: subscription.expiryDate,
    interval: subscription.plan.billingInterval,
    anchorDay: subscription.billingAnchorDay,
    asOf: asOfDate,
    resumeStart,
    maxPeriods: MAX_CATCH_UP_PERIODS
  });
  if (periods.length === 0) return { skipped: 'NO_DUE_PERIODS', invoices: [] };

  const taxes = await tx.tax.findMany({ where: { active: true, taxExclusive: true }, include: { applicability: true } });
  const discounts = await loadDiscountCandidates(tx, now);
  const invoices = [];
  const skips = [];
  for (const period of periods) {
    const result = await createInvoiceForPeriod(tx, { subscription, period, taxes, discounts, now });
    if (result.invoice) {
      invoices.push({
        id: result.invoice.id,
        number: result.invoice.number,
        periodStart: formatDateOnly(result.period.startsAt),
        periodEnd: formatDateOnly(result.period.endsAt),
        total: moneyString(result.pricing.total)
      });
    } else {
      skips.push({ periodStart: formatDateOnly(period.startsAt), reason: result.skipped });
    }
  }
  return { skipped: null, invoices, skips, truncated };
}

async function withTransactionRetry(fn, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: 'Serializable', timeout: 30000, maxWait: 10000 });
    } catch (error) {
      if (error?.code === 'P2034' && attempt < attempts) continue;
      throw error;
    }
  }
  throw new Error('Billing transaction retry limit reached.');
}

export async function billSubscription(subscriptionId, { asOf = new Date(), now = new Date() } = {}) {
  const asOfDate = parseDateOnly(asOf instanceof Date ? dateOnlyFromTz(asOf) : asOf);
  return withTransactionRetry((tx) => billSubscriptionInTransaction(tx, subscriptionId, asOfDate, now));
}

export async function runDueBilling({ asOf = new Date(), now = new Date(), subscriptionId = null, batchSize = SUBSCRIPTION_BATCH } = {}) {
  const asOfDate = dateOnlyFromTz(asOf);
  const result = {
    asOf: formatDateOnly(asOfDate),
    subscriptionsScanned: 0,
    subscriptionsWithInvoices: 0,
    invoicesCreated: 0,
    invoices: [],
    skips: [],
    errors: []
  };

  if (subscriptionId) {
    try {
      const one = await billSubscription(subscriptionId, { asOf: asOfDate, now });
      result.subscriptionsScanned = 1;
      if (one.invoices.length > 0) result.subscriptionsWithInvoices = 1;
      result.invoicesCreated = one.invoices.length;
      result.invoices = one.invoices;
      if (one.skipped) result.skips.push({ subscriptionId, reason: one.skipped });
      if (one.skips) result.skips.push(...one.skips.map((skip) => ({ subscriptionId, ...skip })));
    } catch (error) {
      result.errors.push({ subscriptionId, message: error.message, code: error.code ?? null });
    }
    return result;
  }

  const limit = Math.min(Math.max(Number(batchSize) || SUBSCRIPTION_BATCH, 1), 500);
  let cursor = null;
  while (true) {
    const batch = await prisma.subscription.findMany({
      where: { status: 'ACTIVE', startDate: { lte: asOfDate } },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });
    if (batch.length === 0) break;
    for (const subscription of batch) {
      result.subscriptionsScanned += 1;
      try {
        const one = await billSubscription(subscription.id, { asOf: asOfDate, now });
        if (one.invoices.length > 0) {
          result.subscriptionsWithInvoices += 1;
          result.invoicesCreated += one.invoices.length;
          result.invoices.push(...one.invoices);
        }
        if (one.skipped) result.skips.push({ subscriptionId: subscription.id, reason: one.skipped });
        if (one.skips) result.skips.push(...one.skips.map((skip) => ({ subscriptionId: subscription.id, ...skip })));
        if (one.truncated) result.skips.push({ subscriptionId: subscription.id, reason: 'CATCH_UP_TRUNCATED' });
      } catch (error) {
        result.errors.push({ subscriptionId: subscription.id, message: error.message, code: error.code ?? null });
      }
    }
    cursor = batch[batch.length - 1].id;
    if (batch.length < limit) break;
  }
  return result;
}
