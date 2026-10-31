import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errors.js';
import { moneyString } from './money.js';
import { invoiceScopeWhere } from '../modules/billing/access.js';
import { nextBillingDayStartUtc, parseDateOnly, startOfBillingDayUtc, todayInBillingZone } from './billing-calendar.js';
import { serializeInvoice, serializeInvoiceSummary } from './serializers.js';
import { queueInvoiceEmail } from './email.js';

const INVOICE_INCLUDE = {
  customer: { select: { id: true, legalName: true, billingEmail: true, billingAddress: true } },
  billingPeriod: {
    include: {
      subscription: { select: { id: true, number: true, planId: true, status: true } }
    }
  },
  lines: { include: { taxes: true }, orderBy: { id: 'asc' } },
  logs: { orderBy: { createdAt: 'asc' } },
  payments: { include: { logs: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'asc' } },
  orders: { orderBy: { createdAt: 'asc' } },
  discountUsage: true
};

const CANCELLABLE = new Set(['DRAFT', 'CONFIRMED', 'SENT']);
const OVERDUE_STATUSES = ['CONFIRMED', 'SENT', 'PARTIALLY_PAID'];

export function overdueWhere(today = todayInBillingZone()) {
  return {
    dueDate: { lt: parseDateOnly(today) },
    balance: { gt: 0 },
    status: { in: OVERDUE_STATUSES }
  };
}

export async function findInvoice(invoiceId, client = prisma) {
  return client.invoice.findUnique({ where: { id: invoiceId }, include: INVOICE_INCLUDE });
}

async function lockInvoice(tx, invoiceId) {
  const rows = await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} FOR UPDATE`;
  if (rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Invoice was not found.');
  return findInvoice(invoiceId, tx);
}

export async function listInvoices({ actor, page, pageSize, skip, orderBy, filters }) {
  const scope = await invoiceScopeWhere(actor);
  const today = todayInBillingZone();
  const conditions = [scope];

  if (filters.status) {
    if (filters.status === 'OVERDUE') conditions.push(overdueWhere(today));
    else conditions.push({ status: filters.status });
  }
  if (filters.overdue === true) conditions.push(overdueWhere(today));
  if (filters.search) {
    conditions.push({
      OR: [
        { number: { contains: filters.search, mode: 'insensitive' } },
        { customer: { legalName: { contains: filters.search, mode: 'insensitive' } } }
      ]
    });
  }
  if (filters.customerId) conditions.push({ customerId: filters.customerId });
  if (filters.dueFrom) conditions.push({ dueDate: { gte: parseDateOnly(filters.dueFrom) } });
  if (filters.dueTo) conditions.push({ dueDate: { lte: parseDateOnly(filters.dueTo) } });
  if (filters.createdFrom) conditions.push({ createdAt: { gte: startOfBillingDayUtc(parseDateOnly(filters.createdFrom)) } });
  if (filters.createdTo) conditions.push({ createdAt: { lt: nextBillingDayStartUtc(parseDateOnly(filters.createdTo)) } });

  const where = { AND: conditions };
  const [rows, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: orderBy ?? { createdAt: 'desc' },
      include: {
        customer: { select: { legalName: true } },
        billingPeriod: { select: { id: true, startsAt: true, endsAt: true, subscriptionId: true } }
      }
    }),
    prisma.invoice.count({ where })
  ]);
  return {
    data: rows.map((invoice) => serializeInvoiceSummary(invoice, today)),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
  };
}

export async function getInvoice({ actor, invoiceId }) {
  const scope = await invoiceScopeWhere(actor);
  const invoice = await prisma.invoice.findFirst({ where: { AND: [{ id: invoiceId }, scope] }, include: INVOICE_INCLUDE });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice was not found.');
  return serializeInvoice(invoice);
}

export async function confirmInvoice({ invoiceId, note = null, actor }) {
  const result = await prisma.$transaction(async (tx) => {
    const invoice = await lockInvoice(tx, invoiceId);
    if (invoice.status !== 'DRAFT') throw new AppError(409, 'INVALID_STATUS', `Only draft invoices can be confirmed; this invoice is ${invoice.status}.`);
    if (invoice.payments.length > 0) throw new AppError(409, 'INVALID_STATUS', 'An invoice with payments cannot be confirmed as a draft.');

    const now = new Date();
    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'CONFIRMED',
        logs: { create: { status: 'CONFIRMED', note: note ?? `Confirmed by ${actor?.userId ?? 'staff'}.` } }
      },
      include: INVOICE_INCLUDE
    });

    if (invoice.discountUsage && !invoice.discountUsage.releasedAt && !invoice.discountUsage.consumedAt) {
      await tx.discountUsage.update({ where: { id: invoice.discountUsage.id }, data: { consumedAt: now } });
    }

    const outbox = await queueInvoiceEmail(updated, tx);
    return { invoice: updated, emailQueued: Boolean(outbox), outboxId: outbox?.id ?? null };
  });

  return {
    invoice: serializeInvoice(result.invoice),
    emailQueued: result.emailQueued,
    outboxId: result.outboxId
  };
}

export async function sendInvoice({ invoiceId, actor }) {
  const invoice = await prisma.$transaction(async (tx) => {
    const locked = await lockInvoice(tx, invoiceId);
    if (['DRAFT', 'CANCELLED'].includes(locked.status)) {
      throw new AppError(409, 'INVALID_STATUS', `Invoice ${locked.number} cannot be emailed while ${locked.status}.`);
    }
    const outbox = await queueInvoiceEmail(locked, tx);
    if (!outbox) throw new AppError(409, 'NO_BILLING_EMAIL', 'The customer has no billing email address.');
    await tx.invoiceStatusLog.create({
      data: { invoiceId: locked.id, status: locked.status, note: `Invoice email queued by ${actor?.userId ?? 'staff'}.` }
    });
    return { invoice: locked, outboxId: outbox.id };
  });
  return { data: serializeInvoice(invoice.invoice), outboxId: invoice.outboxId };
}

export async function cancelInvoice({ invoiceId, note = null, actor }) {
  const invoice = await prisma.$transaction(async (tx) => {
    const locked = await lockInvoice(tx, invoiceId);
    if (locked.status === 'CANCELLED') throw new AppError(409, 'INVALID_STATUS', 'Invoice is already cancelled.');
    if (!CANCELLABLE.has(locked.status)) {
      throw new AppError(409, 'INVOICE_HAS_PAYMENTS', 'Paid or partially paid invoices cannot be cancelled in this MVP.');
    }
    const confirmedPayment = locked.payments.find((payment) => payment.status === 'CONFIRMED');
    if (confirmedPayment) throw new AppError(409, 'INVOICE_HAS_PAYMENTS', 'Invoices with recorded payments cannot be cancelled in this MVP.');

    const updated = await tx.invoice.update({
      where: { id: locked.id },
      data: {
        status: 'CANCELLED',
        logs: { create: { status: 'CANCELLED', note: note ?? `Cancelled by ${actor?.userId ?? 'staff'}.` } }
      },
      include: INVOICE_INCLUDE
    });
    if (locked.discountUsage && !locked.discountUsage.releasedAt) {
      await tx.discountUsage.update({ where: { id: locked.discountUsage.id }, data: { releasedAt: new Date() } });
    }
    return updated;
  });
  return serializeInvoice(invoice);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function renderInvoicePrint({ actor, invoiceId }) {
  const scope = await invoiceScopeWhere(actor);
  const invoice = await prisma.invoice.findFirst({ where: { AND: [{ id: invoiceId }, scope] }, include: INVOICE_INCLUDE });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice was not found.');
  const company = await prisma.companySetting.findFirst();
  const snapshot = invoice.customerSnapshot ?? {};
  const rows = invoice.lines
    .map(
      (line) => `<tr><td>${escapeHtml(line.description)}</td><td class="num">${line.quantity}</td><td class="num">${moneyString(line.unitPrice)}</td><td class="num">${moneyString(line.discountAmount)}</td><td class="num">${moneyString(line.lineTotal)}</td></tr>`
    )
    .join('');
  const taxRows = invoice.lines
    .flatMap((line) => line.taxes.map((tax) => `<tr><td>${escapeHtml(line.description)} — ${escapeHtml(tax.name)}</td><td class="num">${moneyString(tax.rate)}%</td><td class="num">${moneyString(tax.amount)}</td></tr>`))
    .join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(invoice.number)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;color:#111}header{display:flex;justify-content:space-between;gap:2rem;border-bottom:2px solid #111;padding-bottom:1rem}h1{font-size:1.4rem;margin:0}.muted{color:#555}.num{text-align:right}table{width:100%;border-collapse:collapse;margin-top:1rem}th,td{border-bottom:1px solid #ddd;padding:.4rem;text-align:left}th{background:#f5f5f5}dl{display:grid;grid-template-columns:12rem auto;gap:.25rem 1rem}.total{font-weight:700}@media print{body{margin:0}button{display:none}}
</style></head><body>
<header><div><h1>${escapeHtml(company?.legalName ?? 'Brightloop Software')}</h1><div class="muted">${escapeHtml(company?.address ?? '')}</div></div><div><h1>Invoice ${escapeHtml(invoice.number)}</h1><div class="muted">${escapeHtml(invoice.status)}</div></div></header>
<section><h2>Bill to</h2><p>${escapeHtml(snapshot.legalName ?? '')}<br>${escapeHtml(snapshot.billingEmail ?? '')}<br>${escapeHtml(typeof snapshot.billingAddress === 'string' ? snapshot.billingAddress : JSON.stringify(snapshot.billingAddress ?? ''))}</p></section>
<dl><dt>Period</dt><dd>${escapeHtml(invoice.billingPeriod.startsAt.toISOString().slice(0, 10))} to ${escapeHtml(invoice.billingPeriod.endsAt.toISOString().slice(0, 10))}</dd><dt>Due date</dt><dd>${escapeHtml(invoice.dueDate.toISOString().slice(0, 10))}</dd><dt>Currency</dt><dd>${escapeHtml(invoice.currency)}</dd></dl>
<table><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Discount</th><th class="num">Line total</th></tr></thead><tbody>${rows}</tbody></table>
<table><thead><tr><th>Tax</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>${taxRows}</tbody></table>
<dl class="total"><dt>Subtotal</dt><dd class="num">INR ${moneyString(invoice.subtotal)}</dd><dt>Discount</dt><dd class="num">INR ${moneyString(invoice.discountTotal)}</dd><dt>Tax</dt><dd class="num">INR ${moneyString(invoice.taxTotal)}</dd><dt>Total</dt><dd class="num">INR ${moneyString(invoice.total)}</dd><dt>Balance</dt><dd class="num">INR ${moneyString(invoice.balance)}</dd></dl>
<section><h2>Payment history</h2><table><thead><tr><th>Date</th><th>Method</th><th>Status</th><th class="num">Amount</th></tr></thead><tbody>${invoice.payments.map((payment) => `<tr><td>${escapeHtml(payment.paidAt.toISOString().slice(0, 10))}</td><td>${escapeHtml(payment.method)}</td><td>${escapeHtml(payment.status)}</td><td class="num">INR ${moneyString(payment.amount)}</td></tr>`).join('')}</tbody></table></section>
<script>if(new URLSearchParams(location.search).get('print')==='1') window.print();</script>
</body></html>`;
}

export { INVOICE_INCLUDE };
