import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultReportRange, kanbanBucketWhere, validateReportRange } from '../src/services/reporting-rules.js';
import { formatDateOnly } from '../src/services/billing-calendar.js';

const day = (offset) => formatDateOnly(new Date(Date.UTC(2026, 9, 15 + offset)));

function dueCondition(bucket) {
  return kanbanBucketWhere(bucket, '2026-10-15').AND[1].dueDate;
}

test('kanban buckets have non-overlapping day boundaries', () => {
  assert.equal(formatDateOnly(dueCondition('overdue').lt), '2026-10-15');
  assert.equal(formatDateOnly(dueCondition('today')), '2026-10-15');
  assert.equal(formatDateOnly(dueCondition('next_2_days').gt), '2026-10-15');
  assert.equal(formatDateOnly(dueCondition('next_2_days').lte), '2026-10-17');
  assert.equal(formatDateOnly(dueCondition('rest_of_7_days').gt), '2026-10-17');
  assert.equal(formatDateOnly(dueCondition('rest_of_7_days').lte), '2026-10-22');
  assert.equal(formatDateOnly(dueCondition('later').gt), '2026-10-22');
});

test('kanban buckets cover each boundary date exactly once', () => {
  const buckets = ['overdue', 'today', 'next_2_days', 'rest_of_7_days', 'later'];
  const matches = (bucket, date) => {
    const condition = dueCondition(bucket);
    if (condition instanceof Date) return date === formatDateOnly(condition);
    if (condition.lt) return date < formatDateOnly(condition.lt);
    if (condition.gt && condition.lte) return date > formatDateOnly(condition.gt) && date <= formatDateOnly(condition.lte);
    if (condition.gt) return date > formatDateOnly(condition.gt);
    return false;
  };
  for (const offset of [-1, 0, 1, 2, 3, 7, 8]) {
    const date = day(offset);
    const owners = buckets.filter((bucket) => matches(bucket, date));
    assert.equal(owners.length, 1, `${date} matched ${owners.join(', ')}`);
  }
});

test('default report range is the current month to today in Kolkata', () => {
  const range = defaultReportRange(new Date('2026-10-31T00:00:00Z'));
  assert.equal(range.from, '2026-10-01');
  assert.equal(range.to, '2026-10-31');
});

test('report ranges reject reversed and excessive spans', () => {
  assert.throws(() => validateReportRange('2026-10-31', '2026-10-01'), /on or before/);
  assert.throws(() => validateReportRange('2024-01-01', '2027-12-31'), /cannot exceed/);
  assert.equal(validateReportRange('2026-01-01', '2026-03-31').to, '2026-03-31');
});
