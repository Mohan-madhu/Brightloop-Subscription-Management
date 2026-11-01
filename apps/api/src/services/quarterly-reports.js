import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errors.js';
import { quarterBounds, previousQuarterKey, formatDateOnly } from './billing-calendar.js';
import { buildQuarterCsv, quarterlySummary } from './reports.js';
import { queueEmail } from './email.js';

const REPORT_TYPE = 'QUARTERLY';
const STALE_RUN_MS = 30 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reportRecipients() {
  return String(process.env.REPORT_RECIPIENTS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => EMAIL_PATTERN.test(value));
}

function reportKeyWhere(periodKey) {
  return { reportType_periodKey: { reportType: REPORT_TYPE, periodKey } };
}

async function claimRun(periodKey, now) {
  let run = await prisma.reportRun.findUnique({ where: reportKeyWhere(periodKey) });
  if (!run) {
    try {
      run = await prisma.reportRun.create({
        data: { reportType: REPORT_TYPE, periodKey, status: 'QUEUED', metadata: { trigger: 'scheduler' } }
      });
    } catch (error) {
      if (error?.code !== 'P2002') throw error;
      run = await prisma.reportRun.findUnique({ where: reportKeyWhere(periodKey) });
    }
  }
  if (!run) throw new AppError(500, 'REPORT_CLAIM_FAILED', 'Could not create the quarterly report run.');
  if (run.status === 'COMPLETED') return { run, skip: 'ALREADY_COMPLETED' };
  if (run.status === 'RUNNING' && run.startedAt && now.getTime() - run.startedAt.getTime() < STALE_RUN_MS) {
    return { run, skip: 'IN_PROGRESS' };
  }
  const staleBefore = new Date(now.getTime() - STALE_RUN_MS);
  const claimed = await prisma.reportRun.updateMany({
    where: {
      id: run.id,
      OR: [
        { status: 'QUEUED' },
        { status: 'FAILED' },
        { status: 'RUNNING', startedAt: { lt: staleBefore } }
      ]
    },
    data: { status: 'RUNNING', startedAt: now, completedAt: null }
  });
  if (claimed.count !== 1) {
    const current = await prisma.reportRun.findUnique({ where: { id: run.id } });
    return { run: current, skip: 'CLAIMED_ELSEWHERE' };
  }
  return { run: await prisma.reportRun.findUnique({ where: { id: run.id } }) };
}

export async function runQuarterlyReport({ periodKey = previousQuarterKey(), actor = null, trigger = 'manual', now = new Date() } = {}) {
  const bounds = quarterBounds(periodKey);
  const claim = await claimRun(bounds.periodKey, now);
  if (claim.skip) {
    return { skipped: true, reason: claim.skip, report: serializeReportRun(claim.run) };
  }
  const run = claim.run;
  try {
    const summary = await quarterlySummary({
      from: formatDateOnly(bounds.startsAt),
      to: formatDateOnly(new Date(bounds.endsAtExclusive.getTime() - 86400000))
    });
    const csv = buildQuarterCsv({ periodKey: bounds.periodKey, summary });
    const recipients = reportRecipients();
    const configured = recipients.length > 0;
    let deliveryQueued = false;
    let outboxId = null;
    const completed = await prisma.$transaction(async (tx) => {
      if (configured) {
        const summaryText = [
          `Period: ${bounds.periodKey}`,
          `Invoiced: INR ${summary.invoicedAmount} across ${summary.invoiceCount} invoices`,
          `Collected: INR ${summary.collectedAmount} across ${summary.paymentCount} payments`,
          `Outstanding: INR ${summary.outstandingBalance}`
        ].join('\n');
        const outbox = await queueEmail(
          {
            to: recipients,
            subject: `Brightloop quarterly report ${bounds.periodKey}`,
            template: 'quarterly_report',
            data: { periodKey: bounds.periodKey, summaryText },
            attachments: [
              {
                filename: `brightloop-${bounds.periodKey}.csv`,
                contentType: 'text/csv',
                contentBase64: Buffer.from(csv, 'utf8').toString('base64')
              }
            ]
          },
          tx
        );
        deliveryQueued = true;
        outboxId = outbox.id;
      }
      return tx.reportRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          metadata: {
            summary,
            csvFilename: `brightloop-${bounds.periodKey}.csv`,
            recipients,
            deliveryQueued,
            outboxId,
            deliveryNote: configured
              ? 'CSV queued to REPORT_RECIPIENTS; SMTP processing obeys EMAIL_DELIVERY_ENABLED.'
              : 'REPORT_RECIPIENTS is not configured; report generated without delivery.',
            trigger,
            triggeredBy: actor?.userId ?? null
          }
        }
      });
    });
    return {
      skipped: false,
      report: serializeReportRun(completed),
      summary,
      deliveryQueued,
      outboxId,
      csv
    };
  } catch (error) {
    await prisma.reportRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        metadata: { error: String(error.message ?? 'Quarterly report failed.').slice(0, 1000), trigger, triggeredBy: actor?.userId ?? null }
      }
    });
    throw error;
  }
}

export async function runDueQuarterlyReports({ now = new Date() } = {}) {
  const periodKey = previousQuarterKey(now);
  return runQuarterlyReport({ periodKey, trigger: 'scheduler', now });
}

export function serializeReportRun(run) {
  if (!run) return null;
  return {
    id: run.id,
    reportType: run.reportType,
    periodKey: run.periodKey,
    period: run.periodKey,
    status: run.status,
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    createdAt: run.createdAt?.toISOString() ?? null,
    downloadAvailable: run.status === 'COMPLETED',
    metadata: run.metadata ?? null
  };
}

export async function listQuarterlyRuns({ page, pageSize, skip }) {
  const where = { reportType: REPORT_TYPE };
  const [rows, total] = await prisma.$transaction([
    prisma.reportRun.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
    prisma.reportRun.count({ where })
  ]);
  return {
    data: rows.map(serializeReportRun),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
  };
}

export { REPORT_TYPE };
