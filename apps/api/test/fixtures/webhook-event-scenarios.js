/**
 * Comprehensive dataset of 50 deterministic Razorpay Webhook Event payloads.
 * Covers captured, failed, authorized, and order payment events across multiple
 * payment methods (UPI, Cards, Netbanking, Wallets) for test simulations.
 */

import { razorpaySignature } from '../../src/services/razorpay-signature.js';

export const TEST_WEBHOOK_SECRET = 'rzp_test_secret_key_mock_99999';

export function buildWebhookScenarios(count = 50) {
  const events = [];
  const eventTypes = ['payment.captured', 'payment.failed', 'order.paid'];
  const methods = ['upi', 'card', 'netbanking', 'wallet'];
  const banks = ['HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK'];
  const wallets = ['paytm', 'phonepe', 'freecharge', 'mobikwik'];

  for (let i = 1; i <= count; i += 1) {
    const eventType = eventTypes[(i - 1) % eventTypes.length];
    const method = methods[(i - 1) % methods.length];
    const amountPaise = (1000 + (i * 250)) * 100;
    const paymentId = `pay_mock_${String(i).padStart(5, '0')}`;
    const orderId = `order_mock_${String(i).padStart(5, '0')}`;
    const invoiceId = `inv_mock_${String(i).padStart(5, '0')}`;
    const createdAt = 1761895200 + (i * 3600);

    const isFailed = eventType === 'payment.failed';
    const isCaptured = eventType === 'payment.captured' || eventType === 'order.paid';

    const entity = {
      id: paymentId,
      entity: 'payment',
      amount: amountPaise,
      currency: 'INR',
      status: isFailed ? 'failed' : 'captured',
      order_id: orderId,
      invoice_id: null,
      international: false,
      method,
      amount_refunded: 0,
      refund_status: null,
      captured: isCaptured,
      description: `Payment for Brightloop Invoice ${invoiceId}`,
      card_id: method === 'card' ? `card_mock_${i}` : null,
      bank: method === 'netbanking' ? banks[i % banks.length] : null,
      wallet: method === 'wallet' ? wallets[i % wallets.length] : null,
      vpa: method === 'upi' ? `client${i}@okaxis` : null,
      email: `client${i}@enterprise-billing.test`,
      contact: `+9198765${String(i).padStart(5, '0')}`,
      notes: {
        invoiceId,
        platform: 'Brightloop',
        environment: 'simulation'
      },
      fee: Math.round(amountPaise * 0.02),
      tax: Math.round(amountPaise * 0.02 * 0.18),
      error_code: isFailed ? 'BAD_REQUEST_ERROR' : null,
      error_description: isFailed ? 'Bank declined the transaction' : null,
      error_source: isFailed ? 'bank' : null,
      error_step: isFailed ? 'payment_authorization' : null,
      error_reason: isFailed ? 'payment_failed' : null,
      created_at: createdAt
    };

    const payload = {
      entity: 'event',
      account_id: 'acc_brightloop_test',
      event: eventType,
      contains: ['payment'],
      payload: {
        payment: { entity }
      },
      created_at: createdAt
    };

    const rawBodyBuffer = Buffer.from(JSON.stringify(payload));
    const signature = razorpaySignature(rawBodyBuffer, TEST_WEBHOOK_SECRET);

    events.push({
      scenarioId: `webhook_scenario_${i}`,
      eventType,
      paymentId,
      orderId,
      invoiceId,
      amountPaise,
      method,
      payload,
      rawBodyBuffer,
      signature
    });
  }

  return events;
}

export const WEBHOOK_SCENARIOS = Object.freeze(buildWebhookScenarios(50));
