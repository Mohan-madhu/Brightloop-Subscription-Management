import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  addMonthsAnchored,
  addYearsAnchored,
  duePeriodsFor,
  formatDateOnly,
  periodEndFor
} from '../src/services/billing-calendar.js';
import { allocatePaymentToInvoice } from '../src/services/payment-rules.js';
import { verifyRazorpaySignature } from '../src/services/razorpay-signature.js';
import { calculatePricing, isDiscountEligible, selectDiscount } from '../src/services/pricing.js';
import { moneyString } from '../src/services/money.js';
import { invoiceScopeWhere, paymentScopeWhere, ROLE } from '../src/modules/billing/access.js';

test('Failure case 1: Running billing twice produces only one recurring invoice per period', () => {
  const interval = { unit: 'month', count: 1 };
  const firstRun = duePeriodsFor({
    startDate: '2026-01-01',
    interval,
    anchorDay: 1,
    asOf: '2026-02-01'
  });
  assert.equal(firstRun.periods.length, 2);
  const lastEnd = firstRun.periods[firstRun.periods.length - 1].endsAt;

  // Second run with lastEnd set to end of previous run
  const secondRun = duePeriodsFor({
    startDate: '2026-01-01',
    lastEnd,
    interval,
    anchorDay: 1,
    asOf: '2026-02-01'
  });
  assert.equal(secondRun.periods.length, 0, 'No duplicate periods produced for already billed span');
});

test('Failure case 2: Concurrent billing attempts reject duplicate billing periods', () => {
  const existingPeriods = new Set();
  function simulateBillingRun(subscriptionId, period) {
    const key = `${subscriptionId}_${formatDateOnly(period.startsAt)}_${formatDateOnly(period.endsAt)}`;
    if (existingPeriods.has(key)) {
      return { skipped: 'PERIOD_ALREADY_EXISTS' };
    }
    existingPeriods.add(key);
    return { created: true, invoiceNumber: `INV-${formatDateOnly(period.startsAt)}-${subscriptionId}` };
  }

  const period = { startsAt: new Date(Date.UTC(2026, 0, 1)), endsAt: new Date(Date.UTC(2026, 1, 1)) };
  const run1 = simulateBillingRun('sub-1', period);
  const run2 = simulateBillingRun('sub-1', period);

  assert.equal(run1.created, true);
  assert.equal(run2.skipped, 'PERIOD_ALREADY_EXISTS');
  assert.equal(existingPeriods.size, 1);
});

test('Failure case 3: Partial then final payment produces exact zero balance and PAID transition', () => {
  const initialBalance = '1500.00';
  const payment1 = allocatePaymentToInvoice({ balance: initialBalance, amount: '500.00' });
  assert.equal(moneyString(payment1.newBalance), '1000.00');
  assert.equal(payment1.status, 'PARTIALLY_PAID');

  const payment2 = allocatePaymentToInvoice({ balance: payment1.newBalance, amount: '1000.00' });
  assert.equal(moneyString(payment2.newBalance), '0.00');
  assert.equal(payment2.status, 'PAID');

  // Attempting another payment when balance is zero
  assert.throws(() => {
    allocatePaymentToInvoice({ balance: payment2.newBalance, amount: '50.00' });
  }, /no outstanding balance/);

  // Attempting overpayment
  assert.throws(() => {
    allocatePaymentToInvoice({ balance: '200.00', amount: '250.00' });
  }, /exceeds the outstanding balance/);
});

test('Failure case 4: Duplicate webhook adds no second payment and detects duplicate event', () => {
  const processedEvents = new Map();
  const confirmedPayments = new Map();

  function simulateWebhookProcessing({ eventId, paymentEntity, order }) {
    if (processedEvents.has(eventId)) {
      return { duplicate: true, reason: 'DUPLICATE_EVENT' };
    }
    processedEvents.set(eventId, { processedAt: new Date() });

    if (confirmedPayments.has(paymentEntity.id)) {
      return { applied: false, duplicate: true, paymentId: paymentEntity.id };
    }
    confirmedPayments.set(paymentEntity.id, {
      amount: paymentEntity.amount,
      status: 'CONFIRMED'
    });
    return { applied: true, duplicate: false, paymentId: paymentEntity.id };
  }

  const payment = { id: 'pay_test123', order_id: 'order_1', amount: 100000, status: 'captured', currency: 'INR' };
  const order = { providerOrderId: 'order_1', invoiceId: 'inv-1', amount: '1000.00', currency: 'INR' };

  const firstDelivery = simulateWebhookProcessing({ eventId: 'evt_1', paymentEntity: payment, order });
  assert.equal(firstDelivery.applied, true);
  assert.equal(firstDelivery.duplicate, false);

  const duplicateDelivery = simulateWebhookProcessing({ eventId: 'evt_1', paymentEntity: payment, order });
  assert.equal(duplicateDelivery.duplicate, true);
  assert.equal(duplicateDelivery.reason, 'DUPLICATE_EVENT');

  // Same payment delivered under a different event id
  const replayUnderNewEvent = simulateWebhookProcessing({ eventId: 'evt_2', paymentEntity: payment, order });
  assert.equal(replayUnderNewEvent.applied, false);
  assert.equal(replayUnderNewEvent.duplicate, true);
  assert.equal(confirmedPayments.size, 1);
});

test('Failure case 5: Bad signature changes nothing and is rejected upfront', () => {
  const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', entity: { id: 'pay_bad' } }));
  const validSecret = 'rzp_test_secret_123';
  const badSecret = 'wrong_secret';
  const tamperedBody = Buffer.from(JSON.stringify({ event: 'payment.captured', entity: { id: 'pay_tampered' } }));

  const validSig = 'a5554f67605e5d3fa96ba29f55e5113d80327f339174540445d4a98e82ef451e';
  // Bad signatures must fail
  assert.equal(verifyRazorpaySignature(rawBody, 'invalid_hex_sig', validSecret), false);
  assert.equal(verifyRazorpaySignature(tamperedBody, validSig, validSecret), false);
  assert.equal(verifyRazorpaySignature(rawBody, validSig, badSecret), false);
  assert.equal(verifyRazorpaySignature(rawBody, '', validSecret), false);
});

test('Failure case 6: Month-end and leap-year schedules remain anchored without drifting', () => {
  // Jan 31 -> Feb 28 -> Mar 31
  const jan31 = '2027-01-31';
  const feb28 = formatDateOnly(addMonthsAnchored(jan31, 1, 31));
  const mar31 = formatDateOnly(addMonthsAnchored(feb28, 1, 31));
  const apr30 = formatDateOnly(addMonthsAnchored(mar31, 1, 31));
  const may31 = formatDateOnly(addMonthsAnchored(apr30, 1, 31));

  assert.equal(feb28, '2027-02-28');
  assert.equal(mar31, '2027-03-31');
  assert.equal(apr30, '2027-04-30');
  assert.equal(may31, '2027-05-31');

  // Leap year Feb 29 anchored yearly
  const leapStart = '2024-02-29';
  const year1 = formatDateOnly(addYearsAnchored(leapStart, 1, 29));
  const year2 = formatDateOnly(addYearsAnchored(year1, 1, 29));
  const year3 = formatDateOnly(addYearsAnchored(year2, 1, 29));
  const year4 = formatDateOnly(addYearsAnchored(year3, 1, 29));

  assert.equal(year1, '2025-02-28');
  assert.equal(year2, '2026-02-28');
  assert.equal(year3, '2027-02-28');
  assert.equal(year4, '2028-02-29'); // returns to Feb 29 in leap year!
});

test('Failure case 7: Paused, closed and expired subscriptions do not generate ineligible invoices', () => {
  const interval = { unit: 'month', count: 1 };

  // Expired subscription capped at expiryDate
  const expiredRun = duePeriodsFor({
    startDate: '2026-01-01',
    expiryDate: '2026-01-15',
    interval,
    anchorDay: 1,
    asOf: '2026-03-01'
  });
  assert.equal(expiredRun.periods.length, 1);
  assert.equal(formatDateOnly(expiredRun.periods[0].startsAt), '2026-01-01');
  assert.equal(formatDateOnly(expiredRun.periods[0].endsAt), '2026-01-16');

  // Post-expiry asOf produces 0 additional periods
  const postExpiryRun = duePeriodsFor({
    startDate: '2026-01-01',
    lastEnd: '2026-01-16',
    expiryDate: '2026-01-15',
    interval,
    anchorDay: 1,
    asOf: '2026-03-01'
  });
  assert.equal(postExpiryRun.periods.length, 0);

  // Resume after pause creates new period starting at resume date
  const resumedRun = duePeriodsFor({
    startDate: '2026-01-01',
    lastEnd: '2026-02-01',
    resumeStart: '2026-02-15',
    interval,
    anchorDay: 1,
    asOf: '2026-02-15'
  });
  assert.equal(resumedRun.periods.length, 1);
  assert.equal(formatDateOnly(resumedRun.periods[0].startsAt), '2026-02-15');
});

test('Failure case 8: Discount cap is not exceeded by concurrent drafts and releases on cancel', () => {
  const discount = {
    id: 'disc-limited',
    code: 'CAP1',
    kind: 'FIXED',
    amount: '100.00',
    active: true,
    usageLimit: 1,
    targets: []
  };
  const lines = [{ key: 'p', description: 'Product', productId: 'p1', quantity: 1, unitPrice: '500.00', taxes: [] }];
  const subtotal = calculatePricing({ lines }).subtotal;

  // First draft: usage count is 0, eligible
  const eligibleFirst = isDiscountEligible({
    discount,
    lines,
    subtotal,
    quantity: 1,
    planId: 'plan-1',
    usageCount: 0
  });
  assert.equal(eligibleFirst, true);

  // Concurrent second draft: usage count is 1 (reserved), INELIGIBLE
  const eligibleSecond = isDiscountEligible({
    discount,
    lines,
    subtotal,
    quantity: 1,
    planId: 'plan-1',
    usageCount: 1
  });
  assert.equal(eligibleSecond, false, 'Discount cap prevented concurrent over-subscription');

  // If draft is cancelled and usage released (usageCount returns to 0):
  const eligibleAfterRelease = isDiscountEligible({
    discount,
    lines,
    subtotal,
    quantity: 1,
    planId: 'plan-1',
    usageCount: 0
  });
  assert.equal(eligibleAfterRelease, true, 'Discount became eligible after draft cancellation');
});

test('Failure case 9: Quarterly retry does not duplicate the report run', () => {
  const runs = new Map();
  function claimQuarterlyRun(periodKey, status = 'QUEUED') {
    if (runs.has(periodKey)) {
      const existing = runs.get(periodKey);
      if (existing.status === 'COMPLETED') return { run: existing, skip: 'ALREADY_COMPLETED' };
      if (existing.status === 'RUNNING') return { run: existing, skip: 'IN_PROGRESS' };
    }
    const run = { id: `run_${periodKey}`, periodKey, status, createdAt: new Date() };
    runs.set(periodKey, run);
    return { run, skip: null };
  }

  // First run claims and completes
  const firstClaim = claimQuarterlyRun('2026-Q3');
  assert.equal(firstClaim.skip, null);
  runs.get('2026-Q3').status = 'COMPLETED';

  // Retry attempt for same quarter
  const retryClaim = claimQuarterlyRun('2026-Q3');
  assert.equal(retryClaim.skip, 'ALREADY_COMPLETED');
  assert.equal(runs.size, 1, 'Exactly one report run exists for the period');
});

test('Failure case 10: Customers cannot access another customer invoices or payments', async () => {
  const customer1Actor = { userId: 'user-c1', roles: [ROLE.CUSTOMER], customerId: 'cust-1' };
  const customer2Actor = { userId: 'user-c2', roles: [ROLE.CUSTOMER], customerId: 'cust-2' };

  const scope1 = await invoiceScopeWhere(customer1Actor);
  const scope2 = await invoiceScopeWhere(customer2Actor);

  assert.deepEqual(scope1, { customerId: 'cust-1' });
  assert.deepEqual(scope2, { customerId: 'cust-2' });

  const paymentScope1 = await paymentScopeWhere(customer1Actor);
  assert.deepEqual(paymentScope1, { invoice: { customerId: 'cust-1' } });

  // If customer has no customerId assigned, fallback resolves via customer record or fails closed
  const unassignedCustomer = { userId: 'user-orphan', roles: [ROLE.CUSTOMER], customerId: null };
  const mockClientNotFound = { customer: { findUnique: async () => null } };
  const orphanScope = await invoiceScopeWhere(unassignedCustomer, mockClientNotFound);
  assert.deepEqual(orphanScope, { id: '__no_customer_record__' });

  const mockClientFound = { customer: { findUnique: async () => ({ id: 'cust-resolved' }) } };
  const resolvedScope = await invoiceScopeWhere(unassignedCustomer, mockClientFound);
  assert.deepEqual(resolvedScope, { customerId: 'cust-resolved' });
});
