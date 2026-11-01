import test from 'node:test';
import assert from 'node:assert/strict';
import { INVOICE_SCENARIOS } from './fixtures/invoice-scenarios.js';
import { serializeInvoice, serializeInvoiceSummary, serializePayment } from '../src/services/serializers.js';
import { dec, moneyString, roundMoney } from '../src/services/money.js';

test('Scenarios: Dataset integrity - exactly 100 enterprise invoice scenarios', () => {
  assert.equal(INVOICE_SCENARIOS.length, 100);
});

test('Scenarios: Financial arithmetic integrity on all 100 fixtures', () => {
  for (const invoice of INVOICE_SCENARIOS) {
    const subtotal = dec(invoice.subtotal);
    const discount = dec(invoice.discountTotal);
    const tax = dec(invoice.taxTotal);
    const total = dec(invoice.total);
    const balance = dec(invoice.balance);

    // subtotal - discount + tax must equal total
    const computedTotal = roundMoney(subtotal.minus(discount).plus(tax));
    assert.equal(
      moneyString(computedTotal),
      moneyString(total),
      `Total mismatch on invoice ${invoice.number}`
    );

    // Sum of confirmed payments
    const confirmedPaymentsTotal = invoice.payments
      .filter((p) => p.status === 'CONFIRMED')
      .reduce((acc, p) => acc.plus(dec(p.amount)), dec(0));

    // balance must equal total - confirmed payments
    const expectedBalance = roundMoney(total.minus(confirmedPaymentsTotal));
    assert.equal(
      moneyString(balance),
      moneyString(expectedBalance),
      `Balance mismatch on invoice ${invoice.number}`
    );
  }
});

test('Scenarios: Every fixture correctly serializes through serializeInvoiceSummary with Najid fields', () => {
  for (const invoice of INVOICE_SCENARIOS) {
    const summary = serializeInvoiceSummary(invoice, '2026-10-31');

    assert.equal(summary.id, invoice.id);
    assert.equal(summary.number, invoice.number);
    assert.equal(summary.currency, 'INR');
    assert.equal(summary.customerName, invoice.customerSnapshot.legalName);
    // Najid required fields
    assert.equal(summary.customerEmail, invoice.customerSnapshot.billingEmail);
    assert.ok(typeof summary.issueDate === 'string' && summary.issueDate.length === 10);
    assert.equal(summary.total, invoice.total);
    assert.equal(summary.balance, invoice.balance);
    assert.equal(typeof summary.overdue, 'boolean');
  }
});

test('Scenarios: Every fixture correctly serializes through serializeInvoice with Najid fields', () => {
  for (const invoice of INVOICE_SCENARIOS) {
    const detail = serializeInvoice(invoice, '2026-10-31');

    assert.equal(detail.id, invoice.id);
    assert.equal(detail.number, invoice.number);
    assert.equal(detail.subtotal, invoice.subtotal);
    assert.equal(detail.discountTotal, invoice.discountTotal);
    assert.equal(detail.taxTotal, invoice.taxTotal);
    assert.equal(detail.total, invoice.total);
    assert.equal(detail.balance, invoice.balance);

    // Najid required fields
    assert.ok(detail.customerAddress !== undefined);
    assert.ok(Array.isArray(detail.history));
    assert.ok(Array.isArray(detail.payments));
    assert.ok(Array.isArray(detail.lines));

    for (const payment of detail.payments) {
      assert.ok(payment.reference !== undefined);
    }
  }
});

test('Scenarios: Status distribution check across all lifecycles', () => {
  const counts = { DRAFT: 0, CONFIRMED: 0, SENT: 0, PARTIALLY_PAID: 0, PAID: 0, CANCELLED: 0 };
  for (const inv of INVOICE_SCENARIOS) {
    counts[inv.status] = (counts[inv.status] ?? 0) + 1;
  }

  assert.ok(counts.DRAFT > 0, 'DRAFT invoices present');
  assert.ok(counts.CONFIRMED > 0, 'CONFIRMED invoices present');
  assert.ok(counts.SENT > 0, 'SENT invoices present');
  assert.ok(counts.PARTIALLY_PAID > 0, 'PARTIALLY_PAID invoices present');
  assert.ok(counts.PAID > 0, 'PAID invoices present');
  assert.ok(counts.CANCELLED > 0, 'CANCELLED invoices present');
});
