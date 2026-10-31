import test from 'node:test';
import assert from 'node:assert/strict';
import { allocatePaymentToInvoice } from '../src/services/payment-rules.js';
import { moneyString } from '../src/services/money.js';
import { isOverdue } from '../src/services/serializers.js';

test('partial payment keeps a remaining balance and PARTIALLY_PAID status', () => {
  const result = allocatePaymentToInvoice({ balance: '1000.00', amount: '250.50' });
  assert.equal(moneyString(result.newBalance), '749.50');
  assert.equal(result.status, 'PARTIALLY_PAID');
});

test('full payment closes the balance and marks PAID', () => {
  const result = allocatePaymentToInvoice({ balance: '749.50', amount: '749.50' });
  assert.equal(moneyString(result.newBalance), '0.00');
  assert.equal(result.status, 'PAID');
});

test('overpayment and zero payments are rejected', () => {
  assert.throws(() => allocatePaymentToInvoice({ balance: '100.00', amount: '100.01' }), /exceeds/);
  assert.throws(() => allocatePaymentToInvoice({ balance: '100.00', amount: '0.00' }), /greater than zero/);
  assert.throws(() => allocatePaymentToInvoice({ balance: '0.00', amount: '1.00' }), /no outstanding balance/);
});

test('overdue is derived from due date and balance, never from a payment status', () => {
  assert.equal(isOverdue({ status: 'CONFIRMED', dueDate: new Date(Date.UTC(2026, 9, 1)), balance: '10.00' }, '2026-10-31'), true);
  assert.equal(isOverdue({ status: 'PARTIALLY_PAID', dueDate: new Date(Date.UTC(2026, 9, 1)), balance: '0.00' }, '2026-10-31'), false);
  assert.equal(isOverdue({ status: 'PAID', dueDate: new Date(Date.UTC(2026, 9, 1)), balance: '0.00' }, '2026-10-31'), false);
  assert.equal(isOverdue({ status: 'CANCELLED', dueDate: new Date(Date.UTC(2026, 9, 1)), balance: '10.00' }, '2026-10-31'), false);
  assert.equal(isOverdue({ status: 'CONFIRMED', dueDate: new Date(Date.UTC(2026, 10, 1)), balance: '10.00' }, '2026-10-31'), false);
});
