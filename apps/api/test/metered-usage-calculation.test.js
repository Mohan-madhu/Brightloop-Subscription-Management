import test from 'node:test';
import assert from 'node:assert/strict';
import {
  USAGE_TIERS_CATALOG,
  METERED_USAGE_SCENARIOS,
  calculateGraduatedPrice,
  calculateVolumePrice,
  calculateOveragePrice
} from './fixtures/metered-usage-scenarios.js';

test('Metered Usage: Dataset contains 50 consumption scenarios', () => {
  assert.equal(METERED_USAGE_SCENARIOS.length, 50);
});

test('Metered Usage: First 10,000 API calls are free under graduated pricing', () => {
  const result = calculateGraduatedPrice(10000, USAGE_TIERS_CATALOG.API_CALLS_GRADUATED.tiers);
  assert.equal(result.formatted, '0.00');
  assert.equal(result.totalCents, 0);
  assert.equal(result.breakdown.length, 1);
  assert.equal(result.breakdown[0].costFormatted, '0.00');
});

test('Metered Usage: 50,000 API calls graduated calculation', () => {
  // First 10,000 @ 0 = 0.00
  // Next 40,000 @ 0.05 = 2000.00
  // Total = 2000.00
  const result = calculateGraduatedPrice(50000, USAGE_TIERS_CATALOG.API_CALLS_GRADUATED.tiers);
  assert.equal(result.formatted, '2000.00');
  assert.equal(result.breakdown.length, 2);
  assert.equal(result.breakdown[0].units, 10000);
  assert.equal(result.breakdown[1].units, 40000);
});

test('Metered Usage: Volume pricing applies single effective rate to entire usage', () => {
  // 50 GB falls in tier 1 (up to 100 @ 2.00) = 100.00
  const t1 = calculateVolumePrice(50, USAGE_TIERS_CATALOG.STORAGE_VOLUME.tiers);
  assert.equal(t1.effectiveRate, '2.00');
  assert.equal(t1.formatted, '100.00');

  // 300 GB falls in tier 2 (up to 500 @ 1.50) = 450.00
  const t2 = calculateVolumePrice(300, USAGE_TIERS_CATALOG.STORAGE_VOLUME.tiers);
  assert.equal(t2.effectiveRate, '1.50');
  assert.equal(t2.formatted, '450.00');

  // 1000 GB falls in tier 3 (up to 2000 @ 1.00) = 1000.00
  const t3 = calculateVolumePrice(1000, USAGE_TIERS_CATALOG.STORAGE_VOLUME.tiers);
  assert.equal(t3.effectiveRate, '1.00');
  assert.equal(t3.formatted, '1000.00');
});

test('Metered Usage: Overage billing charges only units exceeding allowance', () => {
  // 80 hours against 100 allowance -> 0 overage
  const zeroOverage = calculateOveragePrice(80, 100, '5.00');
  assert.equal(zeroOverage.overageUnits, 0);
  assert.equal(zeroOverage.formatted, '0.00');

  // 150 hours against 100 allowance -> 50 overage @ 5.00 = 250.00
  const activeOverage = calculateOveragePrice(150, 100, '5.00');
  assert.equal(activeOverage.overageUnits, 50);
  assert.equal(activeOverage.formatted, '250.00');
});

test('Metered Usage: Zero units returns 0.00 for all pricing models', () => {
  assert.equal(calculateGraduatedPrice(0, USAGE_TIERS_CATALOG.API_CALLS_GRADUATED.tiers).formatted, '0.00');
  assert.equal(calculateVolumePrice(0, USAGE_TIERS_CATALOG.STORAGE_VOLUME.tiers).formatted, '0.00');
  assert.equal(calculateOveragePrice(0, 100, '5.00').formatted, '0.00');
});
