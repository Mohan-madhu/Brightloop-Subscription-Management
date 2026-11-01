import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXEMPTION_CATEGORIES,
  TAX_EXEMPTION_SCENARIOS
} from './fixtures/tax-exemption-rules.js';

test('Tax Exemptions: Dataset contains 50 scenarios', () => {
  assert.equal(TAX_EXEMPTION_SCENARIOS.length, 50);
});

test('Tax Exemptions: SEZ Unit supplies are zero-rated and require SEZ approval reference', () => {
  const sezScenarios = TAX_EXEMPTION_SCENARIOS.filter((s) => s.categoryCode === 'SEZ_LUT');
  assert.ok(sezScenarios.length > 0);

  for (const s of sezScenarios) {
    assert.equal(s.taxTotalFormatted, '0.00');
    assert.ok(s.lutNumber);
    assert.ok(s.sezApprovalReference);
    assert.equal(s.invoiceTotalFormatted, s.taxableValue);
  }
});

test('Tax Exemptions: Export of services under LUT contains valid LUT number and 0 tax', () => {
  const exportScenarios = TAX_EXEMPTION_SCENARIOS.filter((s) => s.categoryCode === 'EXPORT_LUT');
  assert.ok(exportScenarios.length > 0);

  for (const s of exportScenarios) {
    assert.equal(s.taxTotalFormatted, '0.00');
    assert.ok(s.lutNumber);
    assert.equal(s.invoiceTotalFormatted, s.taxableValue);
  }
});

test('Tax Exemptions: Government PSU TDS is deducted at 2% only when value exceeds 2.5 Lakhs', () => {
  const govtScenarios = TAX_EXEMPTION_SCENARIOS.filter((s) => s.categoryCode === 'GOVT_TDS');
  assert.ok(govtScenarios.length > 0);

  for (const s of govtScenarios) {
    const taxable = parseFloat(s.taxableValue);
    const tds = parseFloat(s.tdsDeductedFormatted);

    if (taxable > 250000.00) {
      const expectedTds = Math.round(taxable * 0.02 * 100) / 100;
      assert.equal(tds, expectedTds);
    } else {
      assert.equal(tds, 0.00);
    }

    // Net receivable + TDS deducted must equal invoice total
    const invoiceTotal = parseFloat(s.invoiceTotalFormatted);
    const netReceivable = parseFloat(s.netReceivableFormatted);
    assert.equal(Math.round((netReceivable + tds) * 100) / 100, invoiceTotal);
  }
});
