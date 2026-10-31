import { Decimal, moneyString } from './money.js';
import { formatDateOnly, todayInBillingZone } from './billing-calendar.js';

export function isDecimalLike(value) {
  return value instanceof Decimal || Boolean(value && typeof value.toDecimalPlaces === 'function' && typeof value.toFixed === 'function');
}

export function serialiseValue(value) {
  if (value === null || value === undefined) return value;
  if (isDecimalLike(value)) return moneyString(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialiseValue);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serialiseValue(entry)]));
  }
  return value;
}

export function dateOnly(value) {
  return value ? formatDateOnly(value) : null;
}

export function isOverdue(invoice, today = todayInBillingZone()) {
  if (!invoice?.dueDate || !invoice.balance) return false;
  if (['DRAFT', 'CANCELLED', 'PAID'].includes(invoice.status)) return false;
  if (Number(moneyString(invoice.balance)) <= 0) return false;
  return formatDateOnly(invoice.dueDate) < today;
}

export function serializeInvoiceLine(line) {
  return {
    id: line.id,
    description: line.description,
    quantity: line.quantity,
    unitPrice: moneyString(line.unitPrice),
    discountAmount: moneyString(line.discountAmount),
    lineTotal: moneyString(line.lineTotal),
    snapshot: serialiseValue(line.snapshot),
    taxes: (line.taxes ?? []).map((tax) => ({
      id: tax.id,
      name: tax.name,
      rate: moneyString(tax.rate),
      amount: moneyString(tax.amount)
    }))
  };
}

export function serializePayment(payment) {
  return {
    id: payment.id,
    invoiceId: payment.invoiceId,
    method: payment.method,
    amount: moneyString(payment.amount),
    paidAt: serialiseValue(payment.paidAt),
    note: payment.note,
    providerPaymentId: payment.providerPaymentId,
    status: payment.status,
    createdAt: serialiseValue(payment.createdAt),
    logs: (payment.logs ?? []).map((log) => ({
      id: log.id,
      status: log.status,
      note: log.note,
      createdAt: serialiseValue(log.createdAt)
    }))
  };
}

export function serializeInvoiceSummary(invoice, today = todayInBillingZone()) {
  return {
    id: invoice.id,
    number: invoice.number,
    customerId: invoice.customerId,
    customerName: invoice.customerSnapshot?.legalName ?? invoice.customer?.legalName ?? null,
    status: invoice.status,
    overdue: isOverdue(invoice, today),
    currency: invoice.currency,
    dueDate: dateOnly(invoice.dueDate),
    total: moneyString(invoice.total),
    balance: moneyString(invoice.balance),
    createdAt: serialiseValue(invoice.createdAt),
    billingPeriod: invoice.billingPeriod
      ? {
          id: invoice.billingPeriod.id,
          startsAt: dateOnly(invoice.billingPeriod.startsAt),
          endsAt: dateOnly(invoice.billingPeriod.endsAt),
          subscriptionId: invoice.billingPeriod.subscriptionId
        }
      : null
  };
}

export function serializeInvoice(invoice, today = todayInBillingZone()) {
  return {
    ...serializeInvoiceSummary(invoice, today),
    customerSnapshot: serialiseValue(invoice.customerSnapshot),
    discountSnapshot: serialiseValue(invoice.discountSnapshot),
    subtotal: moneyString(invoice.subtotal),
    discountTotal: moneyString(invoice.discountTotal),
    taxTotal: moneyString(invoice.taxTotal),
    version: invoice.version,
    updatedAt: serialiseValue(invoice.updatedAt),
    lines: (invoice.lines ?? []).map(serializeInvoiceLine),
    logs: (invoice.logs ?? []).map((log) => ({
      id: log.id,
      status: log.status,
      note: log.note,
      createdAt: serialiseValue(log.createdAt)
    })),
    payments: (invoice.payments ?? []).map(serializePayment),
    orders: (invoice.orders ?? []).map((order) => ({
      id: order.id,
      provider: order.provider,
      providerOrderId: order.providerOrderId,
      amount: moneyString(order.amount),
      currency: order.currency,
      createdAt: serialiseValue(order.createdAt)
    })),
    discountUsage: invoice.discountUsage
      ? {
          discountId: invoice.discountUsage.discountId,
          reservedAt: serialiseValue(invoice.discountUsage.reservedAt),
          consumedAt: serialiseValue(invoice.discountUsage.consumedAt),
          releasedAt: serialiseValue(invoice.discountUsage.releasedAt)
        }
      : null
  };
}
