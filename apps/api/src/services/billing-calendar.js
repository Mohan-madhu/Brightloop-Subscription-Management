export const BILLING_TIME_ZONE = 'Asia/Kolkata';
export const DAY_MS = 24 * 60 * 60 * 1000;
export const KOLKATA_OFFSET_MINUTES = 330;

export function dateOnlyFromParts(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

export function parseDateOnly(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error('Invalid date.');
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  if (!match) throw new Error('Date must use YYYY-MM-DD.');
  const date = dateOnlyFromParts(Number(match[1]), Number(match[2]), Number(match[3]));
  if (formatDateOnly(date) !== String(value)) throw new Error('Date is not a valid calendar date.');
  return date;
}

export function formatDateOnly(value) {
  const date = value instanceof Date ? value : parseDateOnly(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function dateOnlyFromTz(now = new Date(), timeZone = BILLING_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const read = (type) => Number(parts.find((part) => part.type === type)?.value);
  return dateOnlyFromParts(read('year'), read('month'), read('day'));
}

export function startOfBillingDayUtc(dateValue) {
  const date = parseDateOnly(dateValue);
  return new Date(date.getTime() - KOLKATA_OFFSET_MINUTES * 60 * 1000);
}

export function nextBillingDayStartUtc(dateValue) {
  return startOfBillingDayUtc(addDays(parseDateOnly(dateValue), 1));
}

export function addDays(dateValue, days) {
  const date = parseDateOnly(dateValue);
  return new Date(date.getTime() + days * DAY_MS);
}

export function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Adds months to a calendar date while strictly preserving the subscription's original anchor day.
 * If a target month has fewer days than anchorDay (e.g. Feb 28/29), clamps to the month-end,
 * and restores to the original anchor day in subsequent months (e.g. March 31).
 */
export function addMonthsAnchored(dateValue, months, anchorDay) {
  const date = parseDateOnly(dateValue);
  const targetMonth = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(anchorDay, daysInMonth(year, month));
  return dateOnlyFromParts(year, month + 1, day);
}

export function addYearsAnchored(dateValue, years, anchorDay) {
  const date = parseDateOnly(dateValue);
  const year = date.getUTCFullYear() + years;
  const month = date.getUTCMonth();
  const day = Math.min(anchorDay, daysInMonth(year, month));
  return dateOnlyFromParts(year, month + 1, day);
}

export function normalizeInterval(interval = {}) {
  const unit = String(interval.unit ?? interval.code ?? '').toLowerCase();
  const count = Number(interval.count ?? 1);
  if (!Number.isInteger(count) || count < 1) throw new Error('Billing interval count must be a positive integer.');
  if (unit.startsWith('day')) return { unit: 'day', count };
  if (unit.startsWith('week')) return { unit: 'week', count };
  if (unit.startsWith('month')) return { unit: 'month', count };
  if (unit.startsWith('year')) return { unit: 'year', count };
  throw new Error(`Unsupported billing interval unit: ${unit || '(missing)'}.`);
}

export function nextPeriodBoundary(startDate, interval, anchorDay) {
  const normalized = normalizeInterval(interval);
  if (normalized.unit === 'day') return addDays(startDate, normalized.count);
  if (normalized.unit === 'week') return addDays(startDate, normalized.count * 7);
  if (normalized.unit === 'month') return addMonthsAnchored(startDate, normalized.count, anchorDay);
  return addYearsAnchored(startDate, normalized.count, anchorDay);
}

export function periodEndFor({ startDate, interval, anchorDay, expiryDate = null }) {
  const start = parseDateOnly(startDate);
  let end = nextPeriodBoundary(start, interval, anchorDay);
  if (expiryDate) {
    const exclusiveExpiry = addDays(parseDateOnly(expiryDate), 1);
    if (end.getTime() > exclusiveExpiry.getTime()) end = exclusiveExpiry;
  }
  return end;
}

export function dueDateFor(startDate, paymentTerms) {
  const start = parseDateOnly(startDate);
  const terms = String(paymentTerms ?? '').trim();
  const match = /(?:net\s*)?(\d{1,3})\s*(?:days?)?/i.exec(terms);
  if (!match) return start;
  return addDays(start, Number(match[1]));
}

export function duePeriodsFor({
  startDate,
  lastEnd = null,
  expiryDate = null,
  interval,
  anchorDay,
  asOf,
  resumeStart = null,
  maxPeriods = 520
}) {
  const activation = parseDateOnly(startDate);
  const resume = resumeStart ? parseDateOnly(resumeStart) : null;
  const asOfDate = parseDateOnly(asOf);
  let start = lastEnd ? parseDateOnly(lastEnd) : activation;
  if (resume && resume.getTime() > start.getTime()) start = resume;
  if (start.getTime() < activation.getTime()) start = activation;

  const periods = [];
  let truncated = false;
  while (start.getTime() <= asOfDate.getTime()) {
    if (expiryDate && start.getTime() > parseDateOnly(expiryDate).getTime()) break;
    if (periods.length >= maxPeriods) {
      truncated = true;
      break;
    }
    const end = periodEndFor({ startDate: start, interval, anchorDay, expiryDate });
    if (end.getTime() <= start.getTime()) break;
    periods.push({ startsAt: start, endsAt: end });
    start = end;
  }
  return { periods, truncated };
}

export function quarterKey(dateValue) {
  const date = parseDateOnly(dateValue);
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

export function quarterBounds(periodKey) {
  const match = /^(\d{4})-Q([1-4])$/.exec(String(periodKey ?? ''));
  if (!match) throw new Error('Quarter must use YYYY-Qn.');
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 3;
  return {
    periodKey: `${year}-Q${quarter}`,
    startsAt: dateOnlyFromParts(year, startMonth, 1),
    endsAtExclusive: dateOnlyFromParts(year, endMonth, 1)
  };
}

export function previousQuarterKey(now = new Date()) {
  const today = dateOnlyFromTz(now);
  return quarterKey(addMonthsAnchored(today, -3, 1));
}

export function todayInBillingZone(now = new Date()) {
  return formatDateOnly(dateOnlyFromTz(now));
}
