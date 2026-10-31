import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  addMonthsAnchored,
  addYearsAnchored,
  dateOnlyFromParts,
  dateOnlyFromTz,
  daysInMonth,
  duePeriodsFor,
  formatDateOnly,
  nextPeriodBoundary,
  parseDateOnly,
  periodEndFor,
  quarterBounds,
  quarterKey,
  previousQuarterKey,
  startOfBillingDayUtc,
  nextBillingDayStartUtc
} from '../src/services/billing-calendar.js';

test('Calendar: Days in month across leap and non-leap years (2020 - 2030)', () => {
  const leapYears = [2020, 2024, 2028, 2032, 2036, 2040, 2044, 2048];
  for (const year of leapYears) {
    assert.equal(daysInMonth(year, 1), 29, `February ${year} must have 29 days`);
  }

  const commonYears = [2021, 2022, 2023, 2025, 2026, 2027, 2029, 2030];
  for (const year of commonYears) {
    assert.equal(daysInMonth(year, 1), 28, `February ${year} must have 28 days`);
  }

  // 31-day months: Jan(0), Mar(2), May(4), Jul(6), Aug(7), Oct(9), Dec(11)
  const longMonths = [0, 2, 4, 6, 7, 9, 11];
  for (const m of longMonths) {
    assert.equal(daysInMonth(2026, m), 31, `Month index ${m} must have 31 days`);
  }

  // 30-day months: Apr(3), Jun(5), Sep(8), Nov(10)
  const shortMonths = [3, 5, 8, 10];
  for (const m of shortMonths) {
    assert.equal(daysInMonth(2026, m), 30, `Month index ${m} must have 30 days`);
  }
});

test('Calendar: Monthly anchor day preservation across 48 consecutive months', () => {
  // Start on 31st January 2024 (Leap Year)
  let current = '2024-01-31';
  const anchor = 31;
  const history = [current];

  for (let m = 1; m <= 48; m += 1) {
    current = formatDateOnly(addMonthsAnchored(current, 1, anchor));
    history.push(current);
  }

  // Check specific expected boundaries
  assert.equal(history[0], '2024-01-31');
  assert.equal(history[1], '2024-02-29'); // Leap Feb
  assert.equal(history[2], '2024-03-31'); // Re-anchored to 31
  assert.equal(history[3], '2024-04-30'); // 30-day month
  assert.equal(history[4], '2024-05-31'); // Re-anchored to 31
  assert.equal(history[13], '2025-02-28'); // Non-leap Feb
  assert.equal(history[14], '2025-03-31'); // Re-anchored to 31
  assert.equal(history[25], '2026-02-28'); // Non-leap Feb
  assert.equal(history[26], '2026-03-31'); // Re-anchored to 31
  assert.equal(history[37], '2027-02-28'); // Non-leap Feb
  assert.equal(history[38], '2027-03-31'); // Re-anchored to 31
  assert.equal(history[48], '2028-01-31'); // 4 years later
});

test('Calendar: Anchor day 30 preservation across months', () => {
  let current = '2026-01-30';
  const anchor = 30;
  const history = [current];

  for (let m = 1; m <= 12; m += 1) {
    current = formatDateOnly(addMonthsAnchored(current, 1, anchor));
    history.push(current);
  }

  assert.equal(history[1], '2026-02-28'); // Clamped to Feb 28
  assert.equal(history[2], '2026-03-30'); // Re-anchored to 30th
  assert.equal(history[3], '2026-04-30');
  assert.equal(history[4], '2026-05-30');
  assert.equal(history[5], '2026-06-30');
  assert.equal(history[6], '2026-07-30');
  assert.equal(history[7], '2026-08-30');
  assert.equal(history[8], '2026-09-30');
  assert.equal(history[9], '2026-10-30');
  assert.equal(history[10], '2026-11-30');
  assert.equal(history[11], '2026-12-30');
  assert.equal(history[12], '2027-01-30');
});

test('Calendar: Yearly leap-day anchor across 20-year cycle (2024 to 2044)', () => {
  let current = '2024-02-29';
  const anchor = 29;
  const years = [current];

  for (let y = 1; y <= 20; y += 1) {
    current = formatDateOnly(addYearsAnchored(current, 1, anchor));
    years.push(current);
  }

  assert.equal(years[0], '2024-02-29'); // Leap year
  assert.equal(years[1], '2025-02-28');
  assert.equal(years[2], '2026-02-28');
  assert.equal(years[3], '2027-02-28');
  assert.equal(years[4], '2028-02-29'); // Leap year restored!
  assert.equal(years[8], '2032-02-29'); // Leap year restored!
  assert.equal(years[12], '2036-02-29'); // Leap year restored!
  assert.equal(years[16], '2040-02-29'); // Leap year restored!
  assert.equal(years[20], '2044-02-29'); // Leap year restored!
});

test('Calendar: Multi-year catch-up period generation (120 monthly periods)', () => {
  const monthly = { unit: 'month', count: 1 };
  const { periods, truncated } = duePeriodsFor({
    startDate: '2016-01-01',
    interval: monthly,
    anchorDay: 1,
    asOf: '2026-01-01',
    maxPeriods: 520
  });

  assert.equal(truncated, false);
  assert.equal(periods.length, 121);
  assert.equal(formatDateOnly(periods[0].startsAt), '2016-01-01');
  assert.equal(formatDateOnly(periods[0].endsAt), '2016-02-01');
  assert.equal(formatDateOnly(periods[periods.length - 1].startsAt), '2026-01-01');
  assert.equal(formatDateOnly(periods[periods.length - 1].endsAt), '2026-02-01');
});

test('Calendar: Weekly interval catch-up capping at maxPeriods', () => {
  const weekly = { unit: 'week', count: 1 };
  const { periods, truncated } = duePeriodsFor({
    startDate: '2016-01-01',
    interval: weekly,
    anchorDay: 1,
    asOf: '2026-01-01',
    maxPeriods: 52
  });

  assert.equal(truncated, true);
  assert.equal(periods.length, 52);
  assert.equal(formatDateOnly(periods[0].startsAt), '2016-01-01');
  assert.equal(formatDateOnly(periods[0].endsAt), '2016-01-08');
  assert.equal(formatDateOnly(periods[51].startsAt), '2016-12-23');
  assert.equal(formatDateOnly(periods[51].endsAt), '2016-12-30');
});

test('Calendar: Daily interval advance and period boundaries', () => {
  const daily = { unit: 'day', count: 1 };
  const { periods } = duePeriodsFor({
    startDate: '2026-10-01',
    interval: daily,
    anchorDay: 1,
    asOf: '2026-10-05'
  });

  assert.equal(periods.length, 5);
  assert.equal(formatDateOnly(periods[0].startsAt), '2026-10-01');
  assert.equal(formatDateOnly(periods[0].endsAt), '2026-10-02');
  assert.equal(formatDateOnly(periods[4].startsAt), '2026-10-05');
  assert.equal(formatDateOnly(periods[4].endsAt), '2026-10-06');
});

test('Calendar: Bi-weekly interval advance', () => {
  const biweekly = { unit: 'week', count: 2 };
  const { periods } = duePeriodsFor({
    startDate: '2026-01-01',
    interval: biweekly,
    anchorDay: 1,
    asOf: '2026-02-15'
  });

  assert.equal(periods.length, 4);
  assert.equal(formatDateOnly(periods[0].startsAt), '2026-01-01');
  assert.equal(formatDateOnly(periods[0].endsAt), '2026-01-15');
  assert.equal(formatDateOnly(periods[1].startsAt), '2026-01-15');
  assert.equal(formatDateOnly(periods[1].endsAt), '2026-01-29');
  assert.equal(formatDateOnly(periods[2].startsAt), '2026-01-29');
  assert.equal(formatDateOnly(periods[2].endsAt), '2026-02-12');
  assert.equal(formatDateOnly(periods[3].startsAt), '2026-02-12');
  assert.equal(formatDateOnly(periods[3].endsAt), '2026-02-26');
});

test('Calendar: Quarterly interval (3-month count) anchored', () => {
  const quarterly = { unit: 'month', count: 3 };
  const { periods } = duePeriodsFor({
    startDate: '2026-01-31',
    interval: quarterly,
    anchorDay: 31,
    asOf: '2026-10-31'
  });

  assert.equal(periods.length, 4);
  assert.equal(formatDateOnly(periods[0].startsAt), '2026-01-31');
  assert.equal(formatDateOnly(periods[0].endsAt), '2026-04-30');
  assert.equal(formatDateOnly(periods[1].startsAt), '2026-04-30');
  assert.equal(formatDateOnly(periods[1].endsAt), '2026-07-31');
  assert.equal(formatDateOnly(periods[2].startsAt), '2026-07-31');
  assert.equal(formatDateOnly(periods[2].endsAt), '2026-10-31');
  assert.equal(formatDateOnly(periods[3].startsAt), '2026-10-31');
  assert.equal(formatDateOnly(periods[3].endsAt), '2027-01-31');
});

test('Calendar: Expiry date capping at mid-period', () => {
  const monthly = { unit: 'month', count: 1 };
  const end = periodEndFor({
    startDate: '2026-03-01',
    interval: monthly,
    anchorDay: 1,
    expiryDate: '2026-03-15'
  });

  // End date is capped to exclusive expiry (2026-03-15 + 1 day = 2026-03-16)
  assert.equal(formatDateOnly(end), '2026-03-16');
});

test('Calendar: Expiry date on exact period boundary', () => {
  const monthly = { unit: 'month', count: 1 };
  const end = periodEndFor({
    startDate: '2026-03-01',
    interval: monthly,
    anchorDay: 1,
    expiryDate: '2026-03-31'
  });

  // Regular boundary is 2026-04-01; expiry exclusive is 2026-04-01. They align!
  assert.equal(formatDateOnly(end), '2026-04-01');
});

test('Calendar: Quarter bounds calculation for all four quarters', () => {
  const q1 = quarterBounds('2026-Q1');
  assert.equal(formatDateOnly(q1.startsAt), '2026-01-01');
  assert.equal(formatDateOnly(q1.endsAtExclusive), '2026-04-01');

  const q2 = quarterBounds('2026-Q2');
  assert.equal(formatDateOnly(q2.startsAt), '2026-04-01');
  assert.equal(formatDateOnly(q2.endsAtExclusive), '2026-07-01');

  const q3 = quarterBounds('2026-Q3');
  assert.equal(formatDateOnly(q3.startsAt), '2026-07-01');
  assert.equal(formatDateOnly(q3.endsAtExclusive), '2026-10-01');

  const q4 = quarterBounds('2026-Q4');
  assert.equal(formatDateOnly(q4.startsAt), '2026-10-01');
  assert.equal(formatDateOnly(q4.endsAtExclusive), '2027-01-01');
});

test('Calendar: Quarter key derivation across dates', () => {
  assert.equal(quarterKey('2026-01-01'), '2026-Q1');
  assert.equal(quarterKey('2026-03-31'), '2026-Q1');
  assert.equal(quarterKey('2026-04-01'), '2026-Q2');
  assert.equal(quarterKey('2026-06-30'), '2026-Q2');
  assert.equal(quarterKey('2026-07-01'), '2026-Q3');
  assert.equal(quarterKey('2026-09-30'), '2026-Q3');
  assert.equal(quarterKey('2026-10-01'), '2026-Q4');
  assert.equal(quarterKey('2026-12-31'), '2026-Q4');
});

test('Calendar: Timezone boundary conversions (Asia/Kolkata)', () => {
  // 18:29:59 UTC = 23:59:59 IST (same day)
  const eveningUtc = new Date('2026-10-31T18:29:59.000Z');
  assert.equal(formatDateOnly(dateOnlyFromTz(eveningUtc)), '2026-10-31');

  // 18:30:00 UTC = 00:00:00 IST (next calendar day)
  const midnightIst = new Date('2026-10-31T18:30:00.000Z');
  assert.equal(formatDateOnly(dateOnlyFromTz(midnightIst)), '2026-11-01');

  // Start of billing day in UTC for 2026-11-01 should be 2026-10-31T18:30:00.000Z
  const startUtc = startOfBillingDayUtc('2026-11-01');
  assert.equal(startUtc.toISOString(), '2026-10-31T18:30:00.000Z');

  // Next billing day start in UTC for 2026-11-01 should be 2026-11-01T18:30:00.000Z
  const nextStartUtc = nextBillingDayStartUtc('2026-11-01');
  assert.equal(nextStartUtc.toISOString(), '2026-11-01T18:30:00.000Z');
});
