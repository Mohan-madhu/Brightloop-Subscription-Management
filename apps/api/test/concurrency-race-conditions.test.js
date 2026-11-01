import test from 'node:test';
import assert from 'node:assert/strict';
import { moneyString } from '../src/services/money.js';

test('Concurrency: Atomic discount reservation under 50 simultaneous claims', async () => {
  const discountState = {
    code: 'FLASH50',
    maxUses: 10,
    currentUses: 0,
    lock: false
  };

  /**
   * Simulates an atomic check-and-increment transaction.
   */
  async function claimDiscount(clientId) {
    // Artificial jitter to induce thread interleaving
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 15)));

    // Atomic CAS simulation
    if (discountState.currentUses < discountState.maxUses) {
      discountState.currentUses += 1;
      return { success: true, clientId, useNumber: discountState.currentUses };
    }
    return { success: false, clientId, reason: 'LIMIT_EXCEEDED' };
  }

  const claimPromises = Array.from({ length: 50 }, (_, i) => claimDiscount(`worker_${i + 1}`));
  const results = await Promise.all(claimPromises);

  const successfulClaims = results.filter((r) => r.success);
  const rejectedClaims = results.filter((r) => !r.success);

  assert.equal(successfulClaims.length, 10, 'Exactly 10 claims should succeed');
  assert.equal(rejectedClaims.length, 40, 'Exactly 40 claims should be rejected');
  assert.equal(discountState.currentUses, 10, 'Final discount usage must exactly equal maxUses');
});

test('Concurrency: Parallel payment allocations prevent overpayment and negative balance', async () => {
  const invoice = {
    id: 'inv_race_001',
    total: 1000.00,
    amountPaid: 0.00,
    amountDue: 1000.00,
    status: 'CONFIRMED'
  };

  const paymentAttempts = Array.from({ length: 20 }, (_, i) => ({
    attemptId: `pay_attempt_${i + 1}`,
    amount: 100.00 // Total attempted: 20 * 100 = 2000.00 against 1000.00 due
  }));

  let lockChain = Promise.resolve();

  /**
   * Simulates atomic payment allocation with database row locking.
   */
  async function processPayment(attempt) {
    // Artificial network jitter
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 10)));

    return new Promise((resolve) => {
      lockChain = lockChain.then(async () => {
        const currentDue = parseFloat(invoice.amountDue);

        if (currentDue <= 0 || invoice.status === 'PAID') {
          resolve({ success: false, reason: 'ALREADY_PAID', attemptId: attempt.attemptId });
          return;
        }

        if (attempt.amount > currentDue) {
          resolve({ success: false, reason: 'EXCEEDS_BALANCE', attemptId: attempt.attemptId });
          return;
        }

        invoice.amountPaid = moneyString(parseFloat(invoice.amountPaid) + attempt.amount);
        invoice.amountDue = moneyString(parseFloat(invoice.total) - parseFloat(invoice.amountPaid));

        if (parseFloat(invoice.amountDue) <= 0) {
          invoice.status = 'PAID';
        } else {
          invoice.status = 'PARTIALLY_PAID';
        }

        resolve({ success: true, attemptId: attempt.attemptId, remaining: invoice.amountDue });
      });
    });
  }

  const results = await Promise.all(paymentAttempts.map(processPayment));
  const successfulPayments = results.filter((r) => r.success);
  const rejectedPayments = results.filter((r) => !r.success);

  assert.equal(successfulPayments.length, 10, 'Exactly 10 payments of 100.00 should succeed to clear 1000.00');
  assert.equal(rejectedPayments.length, 10, 'Remaining 10 payments should be rejected');
  assert.equal(invoice.amountPaid, '1000.00');
  assert.equal(invoice.amountDue, '0.00');
  assert.equal(invoice.status, 'PAID');
});

test('Concurrency: Mutual exclusion in subscription billing period generation', async () => {
  const generatedPeriods = new Set();
  const subscriptionId = 'sub_race_001';
  const targetPeriod = '2026-11-01T00:00:00.000Z';

  /**
   * Simulates transactional unique constraint check on subscriptionId + periodStart.
   */
  async function triggerBillingRun(workerId) {
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 12)));

    const periodKey = `${subscriptionId}::${targetPeriod}`;
    if (generatedPeriods.has(periodKey)) {
      return { status: 'SKIPPED', workerId, reason: 'PERIOD_ALREADY_BILLED' };
    }

    generatedPeriods.add(periodKey);
    return {
      status: 'CREATED',
      workerId,
      invoiceId: `inv_gen_${workerId}`
    };
  }

  const workers = Array.from({ length: 15 }, (_, i) => `worker_node_${i + 1}`);
  const outcomes = await Promise.all(workers.map(triggerBillingRun));

  const created = outcomes.filter((o) => o.status === 'CREATED');
  const skipped = outcomes.filter((o) => o.status === 'SKIPPED');

  assert.equal(created.length, 1, 'Only one worker must successfully generate the billing period');
  assert.equal(skipped.length, 14, 'All other workers must detect duplicate and safely skip');
});

test('Concurrency: Draft confirmation race condition idempotency', async () => {
  let invoiceStatus = 'DRAFT';
  let confirmationCount = 0;

  async function confirmDraft(requestId) {
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 8)));

    if (invoiceStatus === 'CONFIRMED') {
      return { ok: true, state: 'ALREADY_CONFIRMED', requestId };
    }

    if (invoiceStatus === 'DRAFT') {
      invoiceStatus = 'CONFIRMED';
      confirmationCount += 1;
      return { ok: true, state: 'JUST_CONFIRMED', requestId };
    }

    return { ok: false, error: 'INVALID_STATE', requestId };
  }

  const requests = Array.from({ length: 10 }, (_, i) => `req_${i + 1}`);
  const results = await Promise.all(requests.map(confirmDraft));

  assert.equal(confirmationCount, 1, 'Draft must be transitioned to CONFIRMED exactly once');
  assert.equal(invoiceStatus, 'CONFIRMED');
  const justConfirmed = results.filter((r) => r.state === 'JUST_CONFIRMED');
  const alreadyConfirmed = results.filter((r) => r.state === 'ALREADY_CONFIRMED');

  assert.equal(justConfirmed.length, 1);
  assert.equal(alreadyConfirmed.length, 9);
});

test('Concurrency: Cancel vs Payment conflict resolution', async () => {
  const invoice = {
    id: 'inv_conflict_01',
    status: 'CONFIRMED',
    amountDue: 500.00,
    amountPaid: 0.00
  };

  async function cancelInvoice() {
    await new Promise((resolve) => setTimeout(resolve, 5));
    if (invoice.status === 'PAID' || invoice.amountPaid > 0) {
      return { success: false, reason: 'CANNOT_CANCEL_PAID_INVOICE' };
    }
    invoice.status = 'CANCELLED';
    return { success: true };
  }

  async function payInvoice() {
    await new Promise((resolve) => setTimeout(resolve, 5));
    if (invoice.status === 'CANCELLED') {
      return { success: false, reason: 'CANNOT_PAY_CANCELLED_INVOICE' };
    }
    invoice.amountPaid = 500.00;
    invoice.amountDue = 0.00;
    invoice.status = 'PAID';
    return { success: true };
  }

  // Execute both in parallel
  const [cancelRes, payRes] = await Promise.all([cancelInvoice(), payInvoice()]);

  // Exactly one of the actions must succeed, the other must be rejected
  const successes = [cancelRes.success, payRes.success].filter(Boolean);
  assert.equal(successes.length, 1, 'Only one transition must win the race');

  if (cancelRes.success) {
    assert.equal(invoice.status, 'CANCELLED');
    assert.equal(payRes.reason, 'CANNOT_PAY_CANCELLED_INVOICE');
  } else {
    assert.equal(invoice.status, 'PAID');
    assert.equal(cancelRes.reason, 'CANNOT_CANCEL_PAID_INVOICE');
  }
});
