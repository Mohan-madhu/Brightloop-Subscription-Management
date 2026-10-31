import { AppError } from '../middleware/errors.js';
import { addDays, dateOnlyFromTz, formatDateOnly, parseDateOnly } from './billing-calendar.js';

export const KANBAN_BUCKETS = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Due today' },
  { key: 'next_2_days', label: 'Next 2 days' },
  { key: 'rest_of_7_days', label: 'Rest of next 7 days' },
  { key: 'later', label: 'Later' }
];

export function defaultReportRange(now = new Date()) {
  const today = dateOnlyFromTz(now);
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  return { from: formatDateOnly(from), to: formatDateOnly(today) };
}

export function validateReportRange(from, to) {
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);
  if (start.getTime() > end.getTime()) throw new AppError(400, 'VALIDATION_ERROR', 'from must be on or before to.');
  if ((end.getTime() - start.getTime()) / 86400000 > 732) throw new AppError(400, 'VALIDATION_ERROR', 'The report range cannot exceed 732 days.');
  return { from: formatDateOnly(start), to: formatDateOnly(end) };
}

export function kanbanBucketWhere(bucket, today = dateOnlyFromTz()) {
  const todayDate = parseDateOnly(today);
  const base = { status: { in: ['CONFIRMED', 'SENT', 'PARTIALLY_PAID'] }, balance: { gt: 0 } };
  const next2 = addDays(todayDate, 2);
  const next7 = addDays(todayDate, 7);
  if (bucket === 'overdue') return { AND: [base, { dueDate: { lt: todayDate } }] };
  if (bucket === 'today') return { AND: [base, { dueDate: todayDate }] };
  if (bucket === 'next_2_days') return { AND: [base, { dueDate: { gt: todayDate, lte: next2 } }] };
  if (bucket === 'rest_of_7_days') return { AND: [base, { dueDate: { gt: next2, lte: next7 } }] };
  if (bucket === 'later') return { AND: [base, { dueDate: { gt: next7 } }] };
  throw new AppError(400, 'VALIDATION_ERROR', `bucket must be one of ${KANBAN_BUCKETS.map((item) => item.key).join(', ')}.`);
}
