import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  addMonthsAnchored,
  dateOnlyFromTz,
  duePeriodsFor,
  formatDateOnly,
  nextPeriodBoundary,
  periodEndFor,
  quarterBounds,
  previousQuarterKey
} from '../src/services/billing-calendar.js';

const monthly = { unit: 'month', count: 1 };

test('monthly anchor clamps February and returns to the 31st', () => {
  assert.equal(formatDateOnly(addMonthsAnchored('2027-01-31', 1, 31)), '2027-02-28');
  assert.equal(formatDateOnly(addMonthsAnchored('2028-01-31', 1, 31)), '2028-02-29');
  assert.equal(formatDateOnly(addMonthsAnchored('2028-02-29', 1, 31)), '2028-03-31');
});

test('month-end catch-up produces contiguous exclusive periods', () => {
  const { periods } = duePeriodsFor({
    startDate: '2027-01-31',
    interval: monthly,
    anchorDay: 31,
    asOf: '2027-04-01'
  });
  assert.deepEqual(periods.map((period) => [formatDateOnly(period.startsAt), formatDateOnly(period.endsAt)]), [
    ['2027-01-31', '2027-02-28'],
    ['2027-02-28', '2027-03-31'],
    ['2027-03-31', '2027-04-30']
  ]);
});

test('daily and weekly intervals advance by days', () => {
  assert.equal(formatDateOnly(nextPeriodBoundary('2026-10-31', { unit: 'day', code: 'DAILY', count: 1 }, 31)), '2026-11-01');
  assert.equal(formatDateOnly(nextPeriodBoundary('2026-10-31', { unit: 'week', count: 2 }, 31)), '2026-11-14');
  assert.equal(formatDateOnly(addDays('2028-02-28', 1)), '2028-02-29');
});

test('expiry caps the final period without proration', () => {
  assert.equal(formatDateOnly(periodEndFor({ startDate: '2027-01-01', interval: monthly, anchorDay: 1, expiryDate: '2027-01-15' })), '2027-01-16');
});

test('resume starts a new billing period at the resume date', () => {
  const { periods } = duePeriodsFor({
    startDate: '2027-01-01',
    lastEnd: '2027-02-01',
    interval: monthly,
    anchorDay: 1,
    resumeStart: '2027-03-10',
    asOf: '2027-03-10'
  });
  assert.equal(periods.length, 1);
  assert.equal(formatDateOnly(periods[0].startsAt), '2027-03-10');
});

test('no periods are produced for a future activation', () => {
  const { periods } = duePeriodsFor({ startDate: '2027-05-01', interval: monthly, anchorDay: 1, asOf: '2027-04-01' });
  assert.equal(periods.length, 0);
});

test('billing timezone is Asia/Kolkata for date boundaries', () => {
  assert.equal(formatDateOnly(dateOnlyFromTz(new Date('2026-10-31T18:29:59Z'))), '2026-10-31');
  assert.equal(formatDateOnly(dateOnlyFromTz(new Date('2026-10-31T19:00:00Z'))), '2026-11-01');
});

test('calendar quarter identity and previous quarter are stable', () => {
  assert.deepEqual(quarterBounds('2026-Q4'), {
    periodKey: '2026-Q4',
    startsAt: new Date(Date.UTC(2026, 9, 1)),
    endsAtExclusive: new Date(Date.UTC(2027, 0, 1))
  });
  assert.equal(previousQuarterKey(new Date('2026-10-31T00:00:00Z')), '2026-Q3');
  assert.equal(previousQuarterKey(new Date('2026-01-15T00:00:00Z')), '2025-Q4');
});
