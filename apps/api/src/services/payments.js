import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errors.js';
import { moneyString, roundMoney } from './money.js';
import { parseDateOnly, startOfBillingDayUtc, nextBillingDayStartUtc } from './billing-calendar.js';
import { paymentScopeWhere } from '../modules/billing/access.js';
import { serializeInvoiceSummary, serializePayment } from './serializers.js';
import { allocatePaymentToInvoice } from './payment-rules.js';

export const MANUAL_PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'OTHER'];
const PAYABLE_STATUSES = ['CONFIRMED', 'SENT', 'PARTIALLY_PAID'];

function paymentInclude() {
  return { logs: { orderBy: { createdAt: 'asc' } }, invoice: { select: { id: true, number: true } } };
}

/**
 * Records a manual payment against an open invoice within a database transaction.
 * Acquires a SELECT ... FOR UPDATE row lock on the invoice to eliminate concurrent double-payment races,
 * recalculates remaining balance, records status logs, and updates invoice status (PARTIALLY_PAID / PAID).
 */
export async function recordManualPayment({ invoiceId, method, amount, paidAt, note = null, actor }) {
  const paymentAmount = roundMoney(amount);
  if (paymentAmount.lte(0)) throw new AppError(400, 'VALIDATION_ERROR', 'Payment amount must be greater than zero.');
  const normalizedMethod = String(method ?? '').toUpperCase().replace(/\s+/g, '_');
  if (!MANUAL_PAYMENT_METHODS.includes(normalizedMethod)) {
    throw new AppError(400, 'VALIDATION_ERROR', `method must be one of ${MANUAL_PAYMENT_METHODS.join(', ')}.`);
  }
  const when = paidAt instanceof Date ? paidAt : new Date(paidAt);
  if (Number.isNaN(when.getTime())) throw new AppError(400, 'VALIDATION_ERROR', 'paidAt must be a valid date.');
  if (when.getTime() > Date.now() + 5 * 60 * 1000) throw new AppError(400, 'VALIDATION_ERROR', 'paidAt cannot be in the future.');

  const result = await prisma.$transaction(async (tx) => {
    const lock = await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} FOR UPDATE`;
    if (lock.length === 0) throw new AppError(404, 'NOT_FOUND', 'Invoice was not found.');
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
    if (invoice.currency !== 'INR') throw new AppError(409, 'UNSUPPORTED_CURRENCY', 'Only INR invoices are supported.');
    if (!PAYABLE_STATUSES.includes(invoice.status)) {
      throw new AppError(409, 'INVALID_STATUS', `Payments cannot be recorded against an invoice in ${invoice.status} status.`);
    }
    const balance = roundMoney(invoice.balance);
    if (balance.lte(0)) throw new AppError(409, 'NOTHING_OUTSTANDING', 'This invoice has no outstanding balance.');
    if (paymentAmount.gt(balance)) throw new AppError(409, 'OVERPAYMENT_NOT_SUPPORTED', `Payment exceeds the outstanding balance of INR ${moneyString(balance)}.`);

    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        method: normalizedMethod,
        amount: moneyString(paymentAmount),
        paidAt: when,
        note: note ? String(note).slice(0, 500) : null,
        status: 'CONFIRMED',
        logs: { create: { status: 'CONFIRMED', note: `Manual payment recorded by ${actor?.userId ?? 'staff'}.` } }
      },
      include: paymentInclude()
    });

    const allocation = allocatePaymentToInvoice({ balance, amount: paymentAmount });
    const newBalance = allocation.newBalance;
    const newStatus = allocation.status;
    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        balance: moneyString(newBalance),
        status: newStatus,
        logs: {
          create: {
            status: newStatus,
            note: `Manual ${normalizedMethod} payment of INR ${moneyString(paymentAmount)} recorded.`
          }
        }
      },
      include: {
        customer: { select: { legalName: true } },
        billingPeriod: { select: { id: true, startsAt: true, endsAt: true, subscriptionId: true } }
      }
    });
    return { payment, invoice: updatedInvoice };
  });

  return {
    data: serializePayment(result.payment),
    invoice: serializeInvoiceSummary(result.invoice)
  };
}

export async function listPayments({ actor, page, pageSize, skip, orderBy, filters }) {
  const scope = await paymentScopeWhere(actor);
  const conditions = [scope];
  if (filters.status) conditions.push({ status: filters.status });
  if (filters.method) conditions.push({ method: filters.method });
  if (filters.invoiceId) conditions.push({ invoiceId: filters.invoiceId });
  if (filters.providerPaymentId) conditions.push({ providerPaymentId: filters.providerPaymentId });
  if (filters.search) {
    conditions.push({
      OR: [
        { providerPaymentId: { contains: filters.search, mode: 'insensitive' } },
        { note: { contains: filters.search, mode: 'insensitive' } },
        { invoice: { number: { contains: filters.search, mode: 'insensitive' } } }
      ]
    });
  }
  if (filters.paidFrom) conditions.push({ paidAt: { gte: startOfBillingDayUtc(parseDateOnly(filters.paidFrom)) } });
  if (filters.paidTo) conditions.push({ paidAt: { lt: nextBillingDayStartUtc(parseDateOnly(filters.paidTo)) } });

  const where = { AND: conditions };
  const [rows, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: orderBy ?? { paidAt: 'desc' },
      include: { logs: { orderBy: { createdAt: 'asc' } }, invoice: { select: { id: true, number: true } } }
    }),
    prisma.payment.count({ where })
  ]);
  return {
    data: rows.map((payment) => ({ ...serializePayment(payment), invoiceNumber: payment.invoice?.number ?? null })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
  };
}

export { PAYABLE_STATUSES };
