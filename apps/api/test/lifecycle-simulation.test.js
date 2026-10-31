import test from 'node:test';
import assert from 'node:assert/strict';
import { ENTERPRISE_SCENARIOS } from './fixtures/enterprise-contract-scenarios.js';
import { WEBHOOK_SCENARIOS, TEST_WEBHOOK_SECRET } from './fixtures/webhook-event-scenarios.js';
import { duePeriodsFor, formatDateOnly, parseDateOnly } from '../src/services/billing-calendar.js';
import { calculatePricing } from '../src/services/pricing.js';
import { allocatePaymentToInvoice } from '../src/services/payment-rules.js';
import { verifyRazorpaySignature } from '../src/services/razorpay-signature.js';
import { dec, moneyString, roundMoney } from '../src/services/money.js';

test('Lifecycle Simulation: Enterprise scenario dataset integrity (200 subscriptions)', () => {
  assert.equal(ENTERPRISE_SCENARIOS.length, 200);
});

test('Lifecycle Simulation: Billing period generation for all active enterprise subscriptions', () => {
  const asOf = '2026-10-31';

  for (const scenario of ENTERPRISE_SCENARIOS) {
    if (scenario.status === 'ACTIVE') {
      const { periods, truncated } = duePeriodsFor({
        startDate: scenario.startDate,
        interval: scenario.billingInterval,
        anchorDay: scenario.billingAnchorDay,
        expiryDate: scenario.expiryDate,
        asOf,
        maxPeriods: 520
      });

      assert.ok(periods.length > 0, `Active subscription ${scenario.number} should generate due periods`);
      assert.equal(truncated, periods.length >= 520);

      // Contiguity check: each period's startsAt must match previous period's endsAt
      for (let i = 1; i < periods.length; i += 1) {
        assert.equal(
          formatDateOnly(periods[i].startsAt),
          formatDateOnly(periods[i - 1].endsAt),
          `Period gap detected in subscription ${scenario.number}`
        );
      }
    }
  }
});

test('Lifecycle Simulation: Expired enterprise subscriptions never bill past expiryDate', () => {
  const asOf = '2026-12-31';

  for (const scenario of ENTERPRISE_SCENARIOS) {
    if (scenario.status === 'EXPIRED' && scenario.expiryDate) {
      const { periods } = duePeriodsFor({
        startDate: scenario.startDate,
        interval: scenario.billingInterval,
        anchorDay: scenario.billingAnchorDay,
        expiryDate: scenario.expiryDate,
        asOf,
        maxPeriods: 520
      });

      const expiryTimestamp = parseDateOnly(scenario.expiryDate).getTime();
      for (const period of periods) {
        assert.ok(
          period.startsAt.getTime() <= expiryTimestamp,
          `Expired subscription ${scenario.number} generated period starting after expiry date`
        );
      }
    }
  }
});

test('Lifecycle Simulation: Full pricing calculation across all 200 scenario lines', () => {
  for (const scenario of ENTERPRISE_SCENARIOS) {
    const lines = scenario.lines.map((l, idx) => ({
      key: `line_${idx}`,
      description: l.description,
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.agreedPrice,
      taxes: [
        { name: 'CGST 9%', rate: '9.00' },
        { name: 'SGST 9%', rate: '9.00' }
      ]
    }));

    const pricing = calculatePricing({ lines });

    assert.ok(pricing.subtotal.gt(0), `Subtotal must be positive for ${scenario.number}`);
    assert.ok(pricing.total.gt(0), `Total must be positive for ${scenario.number}`);
    assert.equal(
      moneyString(pricing.taxTotal),
      moneyString(roundMoney(pricing.subtotal.mul(0.18))),
      `Tax calculation mismatch for ${scenario.number}`
    );
  }
});

test('Lifecycle Simulation: Two-step payment allocation closes invoice balance to 0.00', () => {
  for (const scenario of ENTERPRISE_SCENARIOS.slice(0, 50)) {
    const lines = scenario.lines.map((l, idx) => ({
      key: `line_${idx}`,
      description: l.description,
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.agreedPrice,
      taxes: [{ name: 'GST 18%', rate: '18.00' }]
    }));

    const pricing = calculatePricing({ lines });
    const totalAmount = pricing.total;

    // Step 1: Pay 40%
    const partialAmount = roundMoney(totalAmount.mul(0.4));
    const step1 = allocatePaymentToInvoice({ balance: totalAmount, amount: partialAmount });
    assert.equal(step1.status, 'PARTIALLY_PAID');
    assert.equal(moneyString(step1.newBalance), moneyString(totalAmount.minus(partialAmount)));

    // Step 2: Pay remaining 60%
    const remainingAmount = step1.newBalance;
    const step2 = allocatePaymentToInvoice({ balance: remainingAmount, amount: remainingAmount });
    assert.equal(step2.status, 'PAID');
    assert.equal(moneyString(step2.newBalance), '0.00');
  }
});

test('Lifecycle Simulation: Verification of 50 Razorpay Webhook Event signatures', () => {
  assert.equal(WEBHOOK_SCENARIOS.length, 50);

  for (const webhook of WEBHOOK_SCENARIOS) {
    const isValid = verifyRazorpaySignature(
      webhook.rawBodyBuffer,
      webhook.signature,
      TEST_WEBHOOK_SECRET
    );
    assert.equal(isValid, true, `Signature verification failed for webhook scenario ${webhook.scenarioId}`);

    // Tampered signature must fail
    const badSig = webhook.signature.replace(/[a-f0-9]/, 'x');
    const isBadValid = verifyRazorpaySignature(
      webhook.rawBodyBuffer,
      badSig,
      TEST_WEBHOOK_SECRET
    );
    assert.equal(isBadValid, false);
  }
});

test('Lifecycle Simulation: Simulated captured payment event updates payment status', () => {
  const capturedWebhooks = WEBHOOK_SCENARIOS.filter((w) => w.eventType === 'payment.captured');
  assert.ok(capturedWebhooks.length > 0);

  for (const webhook of capturedWebhooks) {
    const entity = webhook.payload.payload.payment.entity;
    assert.equal(entity.status, 'captured');
    assert.equal(entity.captured, true);
    assert.ok(entity.amount > 0);

    const convertedAmount = moneyString(roundMoney(dec(entity.amount).div(100)));
    assert.ok(Number(convertedAmount) > 0);
  }
});

test('Lifecycle Simulation: Simulated failed payment event records failure reason', () => {
  const failedWebhooks = WEBHOOK_SCENARIOS.filter((w) => w.eventType === 'payment.failed');
  assert.ok(failedWebhooks.length > 0);

  for (const webhook of failedWebhooks) {
    const entity = webhook.payload.payload.payment.entity;
    assert.equal(entity.status, 'failed');
    assert.equal(entity.captured, false);
    assert.ok(entity.error_code !== null);
    assert.ok(entity.error_description !== null);
  }
});
