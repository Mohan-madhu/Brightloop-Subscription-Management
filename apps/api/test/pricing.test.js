import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePricing, resolveCatalogUnitPrice, selectDiscount } from '../src/services/pricing.js';
import { moneyString } from '../src/services/money.js';

const baseLines = [
  { key: 'plan', description: 'Plan base', productId: 'p1', quantity: 2, unitPrice: '1000.00', taxes: [{ name: 'Service tax', rate: '18.00' }] },
  { key: 'addon', description: 'Add-on', productId: 'p2', quantity: 1, unitPrice: '100.00', isAddon: true, taxes: [{ name: 'Service tax', rate: '18.00' }] }
];

test('pricing applies tax-exclusive tax and keeps allocation totals exact', () => {
  const result = calculatePricing({
    lines: baseLines,
    discount: { id: 'd1', code: 'FIXED100', kind: 'FIXED', amount: '100.00', active: true, targets: [] }
  });
  assert.equal(moneyString(result.subtotal), '2100.00');
  assert.equal(moneyString(result.discountTotal), '100.00');
  assert.equal(moneyString(result.taxTotal), '360.00');
  assert.equal(moneyString(result.total), '2360.00');
  assert.equal(result.lines[0].discountAmount.plus(result.lines[1].discountAmount).toFixed(2), '100.00');
});

test('percentage discount is selected over a smaller fixed discount', () => {
  const selected = selectDiscount({
    discounts: [
      { id: 'fixed', code: 'FIXED100', kind: 'FIXED', amount: '100.00', active: true, targets: [] },
      { id: 'percent', code: 'TEN', kind: 'PERCENTAGE', amount: '10.00', active: true, targets: [] }
    ],
    lines: baseLines,
    subtotal: calculatePricing({ lines: baseLines }).subtotal,
    quantity: 3,
    planId: 'plan-1',
    now: new Date('2026-10-31T00:00:00Z'),
    usageCounts: { fixed: 0, percent: 0 }
  });
  assert.equal(selected.discount.code, 'TEN');
  assert.equal(moneyString(selected.reduction), '210.00');
});

test('discount selection breaks ties by earliest start then code', () => {
  const lines = [{ key: 'a', description: 'A', productId: 'p', quantity: 1, unitPrice: '100.00', taxes: [] }];
  const selected = selectDiscount({
    discounts: [
      { id: 'b', code: 'B', kind: 'FIXED', amount: '10.00', active: true, startsAt: '2026-02-01', targets: [] },
      { id: 'a', code: 'A', kind: 'FIXED', amount: '10.00', active: true, startsAt: '2026-02-01', targets: [] }
    ],
    lines,
    subtotal: calculatePricing({ lines }).subtotal,
    quantity: 1,
    planId: 'plan',
    now: new Date('2026-10-31T00:00:00Z'),
    usageCounts: {}
  });
  assert.equal(selected.discount.code, 'A');
});

test('usage limit and target scope exclude ineligible discounts', () => {
  const lines = [{ key: 'a', description: 'A', productId: 'p1', quantity: 1, unitPrice: '100.00', taxes: [] }];
  const selected = selectDiscount({
    discounts: [
      { id: 'capped', code: 'CAPPED', kind: 'FIXED', amount: '50.00', active: true, usageLimit: 1, targets: [] },
      { id: 'other', code: 'OTHER', kind: 'FIXED', amount: '60.00', active: true, targets: [{ productId: 'p2' }] }
    ],
    lines,
    subtotal: calculatePricing({ lines }).subtotal,
    quantity: 1,
    planId: 'plan',
    now: new Date('2026-10-31T00:00:00Z'),
    usageCounts: { capped: 1 }
  });
  assert.equal(selected, null);
});

test('discount never exceeds subtotal', () => {
  const lines = [{ key: 'a', description: 'A', productId: 'p', quantity: 1, unitPrice: '99.99', taxes: [] }];
  const result = calculatePricing({
    lines,
    discount: { id: 'd', code: 'HUGE', kind: 'FIXED', amount: '500.00', active: true, targets: [] }
  });
  assert.equal(moneyString(result.discountTotal), '99.99');
  assert.equal(moneyString(result.total), '0.00');
  assert.equal(moneyString(result.lines[0].lineTotal), '0.00');
});

test('half-up rounding is used for money and tax', () => {
  const lines = [{ key: 'a', description: 'A', productId: 'p', quantity: 1, unitPrice: '0.05', taxes: [{ name: 'Tax', rate: '18.00' }] }];
  const result = calculatePricing({ lines });
  assert.equal(moneyString(result.lines[0].taxes[0].amount), '0.01');
  assert.equal(moneyString(result.total), '0.06');
});

test('catalog price composition uses add-on price separately and adds variant adjustment', () => {
  assert.equal(moneyString(resolveCatalogUnitPrice({ basePrice: '1000', variantAdjustment: '560' })), '1560.00');
  assert.equal(moneyString(resolveCatalogUnitPrice({ basePrice: '1000', addonPrice: '250', isAddon: true, variantAdjustment: '10' })), '260.00');
});
