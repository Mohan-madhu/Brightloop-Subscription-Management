import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateInvoiceSummary,
  validateInvoiceDetail,
  validateDashboard,
  validateKanbanBucket,
  validateQuarterlyReportRun
} from '../src/types/billing-contracts.js';
import { INVOICE_SCENARIOS } from './fixtures/invoice-scenarios.js';
import { serializeInvoice, serializeInvoiceSummary } from '../src/services/serializers.js';

test('Contracts: validateInvoiceSummary validates serialized scenario summary', () => {
  const invoice = INVOICE_SCENARIOS[0];
  const summary = serializeInvoiceSummary(invoice, '2026-10-31');
  const validated = validateInvoiceSummary(summary);
  assert.equal(validated.number, invoice.number);
  assert.equal(validated.currency, 'INR');
});

test('Contracts: validateInvoiceDetail validates serialized scenario detail', () => {
  const invoice = INVOICE_SCENARIOS[1];
  const detail = serializeInvoice(invoice, '2026-10-31');
  const validated = validateInvoiceDetail(detail);
  assert.equal(validated.number, invoice.number);
  assert.equal(validated.subtotal, invoice.subtotal);
  assert.equal(validated.total, invoice.total);
});

test('Contracts: validateDashboard validates compliant dashboard payload', () => {
  const mockDashboard = {
    range: { from: '2026-10-01', to: '2026-10-31' },
    activeSubscriptions: 42,
    invoiced: '125000.00',
    invoicedAmount: '125000.00',
    invoicedInvoiceCount: 35,
    collected: '95000.00',
    collectedAmount: '95000.00',
    collectedPaymentCount: 28,
    outstanding: '30000.00',
    outstandingBalance: '30000.00',
    outstandingInvoiceCount: 7,
    overdueCount: 2,
    overdueBalance: '8000.00',
    overdueInvoiceCount: 2,
    currency: 'INR',
    invoiceCount: 35,
    paidInvoiceCount: 25
  };

  const validated = validateDashboard(mockDashboard);
  assert.equal(validated.currency, 'INR');
  assert.equal(validated.activeSubscriptions, 42);
});

test('Contracts: validateKanbanBucket validates compliant kanban payload', () => {
  const mockBucket = {
    key: 'overdue',
    bucket: 'overdue',
    label: 'Overdue',
    count: 5,
    balance: '12500.00'
  };

  const validated = validateKanbanBucket(mockBucket);
  assert.equal(validated.key, 'overdue');
  assert.equal(validated.balance, '12500.00');
});

test('Contracts: validateQuarterlyReportRun validates report run payload', () => {
  const mockRun = {
    id: 'run_2026_q3',
    reportType: 'QUARTERLY',
    periodKey: '2026-Q3',
    period: '2026-Q3',
    status: 'COMPLETED',
    startedAt: '2026-10-01T00:00:00.000Z',
    completedAt: '2026-10-01T00:01:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    downloadAvailable: true,
    metadata: { summary: {} }
  };

  const validated = validateQuarterlyReportRun(mockRun);
  assert.equal(validated.periodKey, '2026-Q3');
  assert.equal(validated.downloadAvailable, true);
});
