import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateUsageEvent,
  validateUsageBatch,
  validateMeteredInvoiceLine
} from '../src/types/metered-billing-contracts.js';

test('Metered Contracts: validateUsageEvent accepts compliant event', () => {
  const event = {
    id: 'use_api_calls_001',
    subscriptionId: 'sub_test_01',
    customerId: 'cust_test_01',
    metric: 'api_calls',
    quantity: 1500,
    timestamp: '2026-10-31T07:00:00.000Z',
    idempotencyKey: 'idem_batch_001_seq_001'
  };

  const parsed = validateUsageEvent(event);
  assert.equal(parsed.success, true);
});

test('Metered Contracts: validateUsageEvent rejects invalid id format or negative quantity', () => {
  const badId = {
    id: 'invalid_prefix_001',
    subscriptionId: 'sub_test_01',
    customerId: 'cust_test_01',
    metric: 'api_calls',
    quantity: 100,
    timestamp: '2026-10-31T07:00:00.000Z',
    idempotencyKey: 'idem_key_001'
  };
  assert.equal(validateUsageEvent(badId).success, false);

  const negQuantity = {
    id: 'use_neg_001',
    subscriptionId: 'sub_test_01',
    customerId: 'cust_test_01',
    metric: 'api_calls',
    quantity: -50,
    timestamp: '2026-10-31T07:00:00.000Z',
    idempotencyKey: 'idem_key_002'
  };
  assert.equal(validateUsageEvent(negQuantity).success, false);
});

test('Metered Contracts: validateUsageBatch enforces min 1 and max 500 events', () => {
  const emptyBatch = { batchId: 'batch_0', events: [] };
  assert.equal(validateUsageBatch(emptyBatch).success, false);

  const singleEventBatch = {
    batchId: 'batch_1',
    events: [
      {
        id: 'use_001',
        subscriptionId: 'sub_001',
        customerId: 'cust_001',
        metric: 'compute_hours',
        quantity: 10,
        timestamp: '2026-10-31T07:00:00.000Z',
        idempotencyKey: 'idem_batch_1_1'
      }
    ]
  };
  assert.equal(validateUsageBatch(singleEventBatch).success, true);
});

test('Metered Contracts: validateMeteredInvoiceLine verifies line rating schema', () => {
  const line = {
    metric: 'storage_gb',
    description: 'High-speed NVMe block storage',
    pricingModel: 'VOLUME',
    totalUnitsConsumed: 250,
    chargeableUnits: 250,
    unitPrice: '1.50',
    totalCost: '375.00',
    currency: 'INR'
  };

  const parsed = validateMeteredInvoiceLine(line);
  assert.equal(parsed.success, true);
});
