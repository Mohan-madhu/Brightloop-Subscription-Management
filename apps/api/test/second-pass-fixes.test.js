import assert from 'node:assert/strict';
import test from 'node:test';
import { Decimal } from '../src/services/money.js';
import { asOfDateFor, formatDateOnly } from '../src/services/billing-calendar.js';
import { outboxRecoveryStatus } from '../src/services/email.js';
import { serializeReportRun } from '../src/services/quarterly-reports.js';
import { serializeInvoiceSummary, timestampDate } from '../src/services/serializers.js';

test('asOfDateFor accepts date strings and derives IST date for Date values', () => {
  assert.equal(formatDateOnly(asOfDateFor('2026-02-15')), '2026-02-15');
  assert.equal(formatDateOnly(asOfDateFor(new Date('2026-02-01T20:00:00.000Z'))), '2026-02-02');
  assert.equal(formatDateOnly(asOfDateFor(new Date('2026-02-01T18:29:59.999Z'))), '2026-02-01');
});

test('asOfDateFor rejects malformed dates instead of silently rolling over', () => {
  assert.throws(() => asOfDateFor('2026-02-30'));
  assert.throws(() => asOfDateFor('not-a-date'));
});

test('timestampDate converts invoice timestamps to the billing timezone', () => {
  assert.equal(timestampDate('2026-02-01T20:00:00.000Z'), '2026-02-02');
  assert.equal(timestampDate('2026-02-01T18:30:00.000Z'), '2026-02-02');
  assert.equal(timestampDate(null), null);
});

test('invoice issueDate uses the IST calendar date', () => {
  const invoice = {
    id: 'inv_1',
    number: 'INV-2026-0001',
    customerId: 'cus_1',
    customerSnapshot: { legalName: 'Acme', billingEmail: 'billing@acme.test' },
    createdAt: new Date('2026-02-01T20:00:00.000Z'),
    status: 'CONFIRMED',
    currency: 'INR',
    dueDate: new Date('2026-02-10T00:00:00.000Z'),
    total: new Decimal('100.00'),
    balance: new Decimal('100.00'),
    billingPeriod: null
  };
  assert.equal(serializeInvoiceSummary(invoice, '2026-02-02').issueDate, '2026-02-02');
});

test('outbox recovery keeps ambiguous sends uncertain and retries claimed rows', () => {
  assert.equal(outboxRecoveryStatus({ attempts: 1, lastStatus: 'CLAIMED' }), 'PENDING');
  assert.equal(outboxRecoveryStatus({ attempts: 1, lastStatus: 'SENDING' }), 'UNCERTAIN');
  assert.equal(outboxRecoveryStatus({ attempts: 1, lastStatus: 'ACCEPTED' }), 'UNCERTAIN');
  assert.equal(outboxRecoveryStatus({ attempts: 1, lastStatus: null }), 'UNCERTAIN');
  assert.equal(outboxRecoveryStatus({ attempts: 5, lastStatus: 'CLAIMED' }), 'FAILED');
  assert.equal(outboxRecoveryStatus({ attempts: 1, lastStatus: 'FAILED' }), 'FAILED');
});

test('quarterly download is only advertised when a completed run has summary data', () => {
  const base = { id: 'run_1', reportType: 'QUARTERLY', periodKey: '2026-Q1', status: 'COMPLETED' };
  assert.equal(serializeReportRun({ ...base, metadata: { summary: { total: '1.00' } } }).downloadAvailable, true);
  assert.equal(serializeReportRun({ ...base, metadata: {} }).downloadAvailable, false);
  assert.equal(serializeReportRun({ ...base, status: 'RUNNING', metadata: { summary: { total: '1.00' } } }).downloadAvailable, false);
});
