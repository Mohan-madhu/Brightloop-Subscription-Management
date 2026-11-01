import { prisma } from '../db/prisma.js';
import { moneyString, roundMoney, sumMoney } from './money.js';
import { dateOnlyFromTz, formatDateOnly, parseDateOnly, startOfBillingDayUtc, nextBillingDayStartUtc } from './billing-calendar.js';
import { invoiceScopeWhere, paymentScopeWhere, subscriptionScopeWhere } from '../modules/billing/access.js';
import { serializeInvoiceSummary } from './serializers.js';
import { KANBAN_BUCKETS, defaultReportRange, kanbanBucketWhere, validateReportRange } from './reporting-rules.js';

const ISSUED_STATUSES = ['CONFIRMED', 'SENT', 'PARTIALLY_PAID', 'PAID'];
const OPEN_STATUSES = ['CONFIRMED', 'SENT', 'PARTIALLY_PAID'];

export { KANBAN_BUCKETS, defaultReportRange, kanbanBucketWhere, validateReportRange };

function periodBounds(from, to) {
  return { startsAtUtc: startOfBillingDayUtc(from), endsAtUtc: nextBillingDayStartUtc(to) };
}

export async function getDashboard({ actor, from, to, now = new Date() }) {
  const defaults = defaultReportRange(now);
  const range = validateReportRange(from ?? defaults.from, to ?? defaults.to);
  const today = dateOnlyFromTz(now);
  const { startsAtUtc, endsAtUtc } = periodBounds(range.from, range.to);
  const invoiceScope = await invoiceScopeWhere(actor);
  const paymentScope = await paymentScopeWhere(actor);
  const subscriptionScope = await subscriptionScopeWhere(actor);

  const invoicedWhere = {
    AND: [invoiceScope, { status: { in: ISSUED_STATUSES } }, { createdAt: { gte: startsAtUtc, lt: endsAtUtc } }]
  };
  const collectedWhere = {
    AND: [
      paymentScope,
      { status: 'CONFIRMED' },
      { paidAt: { gte: startsAtUtc, lt: endsAtUtc } },
      { invoice: { status: { not: 'CANCELLED' } } }
    ]
  };
  const outstandingWhere = { AND: [invoiceScope, { status: { in: OPEN_STATUSES } }, { balance: { gt: 0 } }] };
  const overdueWhere = {
    AND: [
      invoiceScope,
      { status: { in: OPEN_STATUSES } },
      { balance: { gt: 0 } },
      { dueDate: { lt: today } }
    ]
  };
  const activeSubscriptionWhere = {
    AND: [
      subscriptionScope,
      { status: 'ACTIVE' },
      { startDate: { lte: parseDateOnly(range.to) } },
      { OR: [{ expiryDate: null }, { expiryDate: { gte: parseDateOnly(range.from) } }] }
    ]
  };

  const [
    invoiced,
    collected,
    outstanding,
    overdue,
    activeSubscriptions,
    invoiceCount,
    paidInvoiceCount
  ] = await prisma.$transaction([
    prisma.invoice.aggregate({ where: invoicedWhere, _sum: { total: true }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: collectedWhere, _sum: { amount: true }, _count: { _all: true } }),
    prisma.invoice.aggregate({ where: outstandingWhere, _sum: { balance: true }, _count: { _all: true } }),
    prisma.invoice.aggregate({ where: overdueWhere, _sum: { balance: true }, _count: { _all: true } }),
    prisma.subscription.count({ where: activeSubscriptionWhere }),
    prisma.invoice.count({ where: { AND: [invoiceScope, { createdAt: { gte: startsAtUtc, lt: endsAtUtc } }] } }),
    prisma.invoice.count({ where: { AND: [invoiceScope, { status: 'PAID' }, { createdAt: { gte: startsAtUtc, lt: endsAtUtc } }] } })
  ]);

  return {
    range: { from: range.from, to: range.to },
    activeSubscriptions,
    invoiced: moneyString(invoiced._sum.total ?? 0),
    invoicedAmount: moneyString(invoiced._sum.total ?? 0),
    invoicedInvoiceCount: invoiced._count._all,
    collected: moneyString(collected._sum.amount ?? 0),
    collectedAmount: moneyString(collected._sum.amount ?? 0),
    collectedPaymentCount: collected._count._all,
    outstanding: moneyString(outstanding._sum.balance ?? 0),
    outstandingBalance: moneyString(outstanding._sum.balance ?? 0),
    outstandingInvoiceCount: outstanding._count._all,
    overdueCount: overdue._count._all,
    overdueBalance: moneyString(overdue._sum.balance ?? 0),
    overdueInvoiceCount: overdue._count._all,
    currency: 'INR',
    invoiceCount,
    paidInvoiceCount,
    definitions: {
      invoicedAmount: 'Sum of non-cancelled issued invoice totals with createdAt inside the range.',
      collectedAmount: 'Sum of confirmed payments with paidAt inside the range, excluding cancelled invoices.',
      outstandingBalance: 'Current balance of issued, non-cancelled invoices, independent of range.',
      overdue: 'Current open invoices with dueDate before today in Asia/Kolkata and balance above zero.'
    }
  };
}

export async function getDueKanban({ actor, now = new Date() }) {
  const today = dateOnlyFromTz(now);
  const scope = await invoiceScopeWhere(actor);
  const results = await Promise.all(
    KANBAN_BUCKETS.map(async (bucket) => {
      const where = { AND: [scope, kanbanBucketWhere(bucket.key, today)] };
      const aggregate = await prisma.invoice.aggregate({ where, _sum: { balance: true }, _count: { _all: true } });
      return {
        key: bucket.key,
        bucket: bucket.key,
        label: bucket.label,
        count: aggregate._count._all,
        balance: moneyString(aggregate._sum.balance ?? 0)
      };
    })
  );
  return { today: formatDateOnly(today), buckets: results };
}

export async function getDueKanbanDetail({ actor, bucket, page, pageSize, skip, orderBy, now = new Date() }) {
  const today = dateOnlyFromTz(now);
  const scope = await invoiceScopeWhere(actor);
  const where = { AND: [scope, kanbanBucketWhere(bucket, today)] };
  const [rows, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: orderBy ?? { dueDate: 'asc' },
      include: {
        customer: { select: { legalName: true } },
        billingPeriod: { select: { id: true, startsAt: true, endsAt: true, subscriptionId: true } }
      }
    }),
    prisma.invoice.count({ where })
  ]);
  return {
    data: rows.map((invoice) => serializeInvoiceSummary(invoice, formatDateOnly(today))),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
  };
}

export async function quarterlySummary({ from, to }) {
  const { startsAtUtc, endsAtUtc } = periodBounds(from, to);
  const issuedWhere = { status: { in: ISSUED_STATUSES }, createdAt: { gte: startsAtUtc, lt: endsAtUtc } };
  const collectedWhere = { status: 'CONFIRMED', paidAt: { gte: startsAtUtc, lt: endsAtUtc }, invoice: { status: { not: 'CANCELLED' } } };
  const [invoiced, collected, invoices, outstanding] = await prisma.$transaction([
    prisma.invoice.aggregate({ where: issuedWhere, _sum: { total: true }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: collectedWhere, _sum: { amount: true }, _count: { _all: true } }),
    prisma.invoice.findMany({
      where: issuedWhere,
      orderBy: { createdAt: 'asc' },
      select: {
        number: true,
        status: true,
        dueDate: true,
        total: true,
        balance: true,
        createdAt: true,
        customer: { select: { legalName: true } }
      }
    }),
    prisma.invoice.aggregate({ where: { AND: [issuedWhere, { balance: { gt: 0 } }] }, _sum: { balance: true } })
  ]);
  return {
    invoicedAmount: moneyString(invoiced._sum.total ?? 0),
    invoiceCount: invoiced._count._all,
    collectedAmount: moneyString(collected._sum.amount ?? 0),
    paymentCount: collected._count._all,
    outstandingBalance: moneyString(outstanding._sum.balance ?? 0),
    invoices: invoices.map((invoice) => ({
      number: invoice.number,
      customer: invoice.customer.legalName,
      status: invoice.status,
      createdAt: invoice.createdAt.toISOString(),
      dueDate: formatDateOnly(invoice.dueDate),
      total: moneyString(invoice.total),
      balance: moneyString(invoice.balance)
    }))
  };
}

export function buildQuarterCsv({ periodKey, summary }) {
  const header = ['invoice_number', 'customer', 'status', 'created_at', 'due_date', 'total_inr', 'balance_inr'];
  const rows = summary.invoices.map((invoice) => [
    invoice.number,
    invoice.customer,
    invoice.status,
    invoice.createdAt,
    invoice.dueDate,
    invoice.total,
    invoice.balance
  ]);
  const summaryRows = [
    ['period', periodKey],
    ['invoiced_amount_inr', summary.invoicedAmount],
    ['invoice_count', String(summary.invoiceCount)],
    ['collected_amount_inr', summary.collectedAmount],
    ['payment_count', String(summary.paymentCount)],
    ['outstanding_balance_inr', summary.outstandingBalance],
    []
  ];
  const escape = (value) => {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [...summaryRows.map((row) => row.map(escape).join(',')), header.join(','), ...rows.map((row) => row.map(escape).join(','))].join('\r\n');
}

export { roundMoney, sumMoney };
