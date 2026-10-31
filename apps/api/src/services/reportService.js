import prisma from '../config/db.js';
import { round } from '../utils/pricing.js';

/**
 * Returns comprehensive database-derived metrics for Finance & Admin dashboards.
 */
export async function getDashboardMetrics() {
  const now = new Date();

  // 1. Invoices Aggregations
  const invoices = await prisma.invoice.findMany({
    select: {
      status: true,
      totalAmount: true,
      paidAmount: true,
      outstandingAmount: true,
      dueDate: true
    }
  });

  let totalInvoiced = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;
  let overdueAmount = 0;
  let overdueCount = 0;

  for (const inv of invoices) {
    if (inv.status !== 'CANCELLED') {
      totalInvoiced += inv.totalAmount;
      totalCollected += inv.paidAmount;
      totalOutstanding += inv.outstandingAmount;

      if (inv.outstandingAmount > 0 && new Date(inv.dueDate) < now) {
        overdueAmount += inv.outstandingAmount;
        overdueCount += 1;
      }
    }
  }

  // 2. Subscription Status Breakdown
  const subscriptions = await prisma.subscription.findMany({
    select: { status: true }
  });

  const subscriptionCounts = {
    ACTIVE: 0,
    PAUSED: 0,
    CLOSED: 0,
    DRAFT: 0,
    CONFIRMED: 0,
    QUOTATION: 0,
    TOTAL: subscriptions.length
  };

  subscriptions.forEach((s) => {
    if (subscriptionCounts[s.status] !== undefined) {
      subscriptionCounts[s.status] += 1;
    }
  });

  // 3. Customer Count
  const customerCount = await prisma.user.count({
    where: { role: 'CUSTOMER' }
  });

  return {
    invoicedRevenue: round(totalInvoiced),
    collectedRevenue: round(totalCollected),
    outstandingBalance: round(totalOutstanding),
    overdueBalance: round(overdueAmount),
    overdueInvoicesCount: overdueCount,
    activeSubscriptionsCount: subscriptionCounts.ACTIVE,
    subscriptionBreakdown: subscriptionCounts,
    customerCount,
    currency: 'INR'
  };
}

/**
 * Categorizes unpaid invoices into Due-Date Kanban columns:
 * - Overdue (< today)
 * - Due within 7 days
 * - Due within 30 days
 * - Due later (> 30 days)
 */
export async function getDueDateKanban() {
  const now = new Date();
  const sevenDays = new Date(now);
  sevenDays.setDate(sevenDays.getDate() + 7);

  const thirtyDays = new Date(now);
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['DRAFT', 'CONFIRMED'] },
      outstandingAmount: { gt: 0 }
    },
    include: {
      customer: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { dueDate: 'asc' }
  });

  const kanban = {
    overdue: [],
    dueSoon: [], // 0-7 days
    dueMonth: [], // 7-30 days
    dueLater: [] // > 30 days
  };

  unpaidInvoices.forEach((inv) => {
    const due = new Date(inv.dueDate);
    if (due < now) {
      kanban.overdue.push(inv);
    } else if (due <= sevenDays) {
      kanban.dueSoon.push(inv);
    } else if (due <= thirtyDays) {
      kanban.dueMonth.push(inv);
    } else {
      kanban.dueLater.push(inv);
    }
  });

  return kanban;
}

/**
 * Generates an official quarterly report record in the database.
 */
export async function generateQuarterlyReport(quarter, year) {
  const metrics = await getDashboardMetrics();

  const report = await prisma.quarterlyReport.create({
    data: {
      quarter: quarter || 'Q1',
      year: parseInt(year || new Date().getFullYear(), 10),
      totalInvoiced: metrics.invoicedRevenue,
      totalCollected: metrics.collectedRevenue,
      totalOutstanding: metrics.outstandingBalance,
      activeSubscriptions: metrics.activeSubscriptionsCount,
      reportData: JSON.stringify(metrics)
    }
  });

  return report;
}
