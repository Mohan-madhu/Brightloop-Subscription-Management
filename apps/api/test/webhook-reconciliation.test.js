import test from 'node:test';
import assert from 'node:assert/strict';
import { RECONCILIATION_SCENARIOS } from './fixtures/webhook-reconciliation-matrix.js';

test('Webhook Reconciliation: Dataset contains exactly 50 scenarios', () => {
  assert.equal(RECONCILIATION_SCENARIOS.length, 50);
});

test('Webhook Reconciliation: Settlement balance arithmetic strictly holds', () => {
  for (const scn of RECONCILIATION_SCENARIOS) {
    const gross = scn.grossAmountPaise;
    const fee = scn.feePaise;
    const tax = scn.taxPaise;
    const net = scn.netSettlementPaise;

    assert.equal(
      gross,
      fee + tax + net,
      `Settlement balance mismatch in ${scn.scenarioId}: gross=${gross}, fee=${fee}, tax=${tax}, net=${net}`
    );
  }
});

test('Webhook Reconciliation: Fee calculation conforms to 2% standard plus 18% GST', () => {
  for (const scn of RECONCILIATION_SCENARIOS) {
    const gross = scn.grossAmountPaise;
    const expectedFee = Math.round(gross * 0.02);
    assert.equal(scn.feePaise, expectedFee);

    const expectedTax = Math.round(expectedFee * 0.18);
    assert.equal(scn.taxPaise, expectedTax);
  }
});

test('Webhook Reconciliation: Currency mismatches are accurately flagged', () => {
  const currencyMismatches = RECONCILIATION_SCENARIOS.filter((s) => s.isCurrencyMismatch);
  assert.ok(currencyMismatches.length > 0);

  for (const scn of currencyMismatches) {
    assert.notEqual(scn.currency, scn.expectedCurrency);
    assert.equal(scn.expectedOutcome, 'REJECT_CURRENCY_MISMATCH');
  }
});

test('Webhook Reconciliation: Duplicates are flagged for idempotent skip', () => {
  const duplicates = RECONCILIATION_SCENARIOS.filter((s) => s.isDuplicate);
  assert.ok(duplicates.length > 0);

  for (const scn of duplicates) {
    if (!scn.isCurrencyMismatch) {
      assert.equal(scn.expectedOutcome, 'SKIP_DUPLICATE');
    }
  }
});
