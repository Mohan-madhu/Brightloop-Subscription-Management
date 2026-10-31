import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INVOICE_STATES,
  PAYMENT_STATES,
  SUBSCRIPTION_STATES,
  validateInvoiceTransition,
  assertValidInvoiceTransition,
  validatePaymentTransition,
  assertValidPaymentTransition,
  validateSubscriptionTransition,
  assertValidSubscriptionTransition
} from '../src/types/billing-state-machine.js';

test('State Machine: Invoice allowed forward transitions', () => {
  // DRAFT -> CONFIRMED
  assert.equal(validateInvoiceTransition(INVOICE_STATES.DRAFT, INVOICE_STATES.CONFIRMED).allowed, true);
  // DRAFT -> CANCELLED
  assert.equal(validateInvoiceTransition(INVOICE_STATES.DRAFT, INVOICE_STATES.CANCELLED).allowed, true);
  // CONFIRMED -> SENT
  assert.equal(validateInvoiceTransition(INVOICE_STATES.CONFIRMED, INVOICE_STATES.SENT).allowed, true);
  // CONFIRMED -> PARTIALLY_PAID
  assert.equal(validateInvoiceTransition(INVOICE_STATES.CONFIRMED, INVOICE_STATES.PARTIALLY_PAID).allowed, true);
  // CONFIRMED -> PAID (with zero balance)
  assert.equal(validateInvoiceTransition(INVOICE_STATES.CONFIRMED, INVOICE_STATES.PAID, { amountDue: '0.00' }).allowed, true);
  // PARTIALLY_PAID -> PAID
  assert.equal(validateInvoiceTransition(INVOICE_STATES.PARTIALLY_PAID, INVOICE_STATES.PAID, { amountDue: '0.00' }).allowed, true);
});

test('State Machine: Invoice disallowed transitions', () => {
  // Cannot jump backwards: PAID -> DRAFT
  assert.equal(validateInvoiceTransition(INVOICE_STATES.PAID, INVOICE_STATES.DRAFT).allowed, false);
  // Cannot revive CANCELLED
  assert.equal(validateInvoiceTransition(INVOICE_STATES.CANCELLED, INVOICE_STATES.CONFIRMED).allowed, false);
  // Cannot jump directly from DRAFT to PAID without CONFIRMED
  assert.equal(validateInvoiceTransition(INVOICE_STATES.DRAFT, INVOICE_STATES.PAID).allowed, false);
});

test('State Machine: Invoice cancellation blocked if payments exist', () => {
  // Allowed if amountPaid is zero
  const zeroPaid = validateInvoiceTransition(INVOICE_STATES.CONFIRMED, INVOICE_STATES.CANCELLED, { amountPaid: '0.00' });
  assert.equal(zeroPaid.allowed, true);

  // Rejected if amountPaid > 0
  const partiallyPaid = validateInvoiceTransition(INVOICE_STATES.CONFIRMED, INVOICE_STATES.CANCELLED, { amountPaid: '250.00' });
  assert.equal(partiallyPaid.allowed, false);
  assert.match(partiallyPaid.reason, /Cannot cancel an invoice with recorded payments/);

  assert.throws(
    () => assertValidInvoiceTransition(INVOICE_STATES.CONFIRMED, INVOICE_STATES.CANCELLED, { amountPaid: '500.00' }),
    (err) => err.code === 'INVALID_STATE_TRANSITION'
  );
});

test('State Machine: Invoice mark PAID blocked if outstanding balance remains', () => {
  const withBalance = validateInvoiceTransition(INVOICE_STATES.CONFIRMED, INVOICE_STATES.PAID, { amountDue: '150.00' });
  assert.equal(withBalance.allowed, false);
  assert.match(withBalance.reason, /Cannot transition invoice to PAID while outstanding balance/);

  assert.throws(
    () => assertValidInvoiceTransition(INVOICE_STATES.CONFIRMED, INVOICE_STATES.PAID, { amountDue: '10.00' }),
    (err) => err.code === 'INVALID_STATE_TRANSITION'
  );
});

test('State Machine: Payment state transitions', () => {
  // PENDING -> CONFIRMED
  assert.equal(validatePaymentTransition(PAYMENT_STATES.PENDING, PAYMENT_STATES.CONFIRMED).allowed, true);
  // PENDING -> FAILED
  assert.equal(validatePaymentTransition(PAYMENT_STATES.PENDING, PAYMENT_STATES.FAILED).allowed, true);
  // CONFIRMED -> REFUNDED
  assert.equal(validatePaymentTransition(PAYMENT_STATES.CONFIRMED, PAYMENT_STATES.REFUNDED).allowed, true);

  // Invalid: FAILED -> CONFIRMED
  assert.equal(validatePaymentTransition(PAYMENT_STATES.FAILED, PAYMENT_STATES.CONFIRMED).allowed, false);
  // Invalid: REFUNDED -> PENDING
  assert.equal(validatePaymentTransition(PAYMENT_STATES.REFUNDED, PAYMENT_STATES.PENDING).allowed, false);

  assert.throws(
    () => assertValidPaymentTransition(PAYMENT_STATES.FAILED, PAYMENT_STATES.CONFIRMED),
    (err) => err.code === 'INVALID_PAYMENT_STATE'
  );
});

test('State Machine: Subscription state transitions', () => {
  // DRAFT -> ACTIVE
  assert.equal(validateSubscriptionTransition(SUBSCRIPTION_STATES.DRAFT, SUBSCRIPTION_STATES.ACTIVE).allowed, true);
  // ACTIVE -> PAUSED
  assert.equal(validateSubscriptionTransition(SUBSCRIPTION_STATES.ACTIVE, SUBSCRIPTION_STATES.PAUSED).allowed, true);
  // PAUSED -> ACTIVE (Resume)
  assert.equal(validateSubscriptionTransition(SUBSCRIPTION_STATES.PAUSED, SUBSCRIPTION_STATES.ACTIVE).allowed, true);
  // ACTIVE -> CLOSED
  assert.equal(validateSubscriptionTransition(SUBSCRIPTION_STATES.ACTIVE, SUBSCRIPTION_STATES.CLOSED).allowed, true);
  // ACTIVE -> EXPIRED
  assert.equal(validateSubscriptionTransition(SUBSCRIPTION_STATES.ACTIVE, SUBSCRIPTION_STATES.EXPIRED).allowed, true);

  // Invalid: CLOSED -> ACTIVE
  assert.equal(validateSubscriptionTransition(SUBSCRIPTION_STATES.CLOSED, SUBSCRIPTION_STATES.ACTIVE).allowed, false);
  // Invalid: EXPIRED -> ACTIVE
  assert.equal(validateSubscriptionTransition(SUBSCRIPTION_STATES.EXPIRED, SUBSCRIPTION_STATES.ACTIVE).allowed, false);

  assert.throws(
    () => assertValidSubscriptionTransition(SUBSCRIPTION_STATES.CLOSED, SUBSCRIPTION_STATES.ACTIVE),
    (err) => err.code === 'INVALID_SUBSCRIPTION_STATE'
  );
});
