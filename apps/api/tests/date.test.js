import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateNextBillingDate } from '../src/utils/date.js';

describe('Date & Billing Interval Calculation', () => {
  test('DAILY interval increments by 1 day', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const next = calculateNextBillingDate(start, 'DAILY');
    assert.equal(next.getUTCDate(), 2);
  });

  test('WEEKLY interval increments by 7 days', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const next = calculateNextBillingDate(start, 'WEEKLY');
    assert.equal(next.getUTCDate(), 8);
  });

  test('MONTHLY interval handles month overflow (Jan 31 -> Feb 28)', () => {
    const start = new Date('2026-01-31T00:00:00.000Z');
    const next = calculateNextBillingDate(start, 'MONTHLY');
    assert.equal(next.getUTCMonth(), 1); // February
    assert.equal(next.getUTCDate(), 28); // 2026 is non-leap year
  });

  test('YEARLY interval increments by 1 year', () => {
    const start = new Date('2026-05-15T00:00:00.000Z');
    const next = calculateNextBillingDate(start, 'YEARLY');
    assert.equal(next.getUTCFullYear(), 2027);
    assert.equal(next.getUTCMonth(), 4);
    assert.equal(next.getUTCDate(), 15);
  });
});
