import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GST_COMPLIANCE_SCENARIOS,
  COMPANY_GST_PROFILE,
  INDIAN_STATE_CODES,
  SAC_CODES
} from './fixtures/gst-compliance-dataset.js';
import { moneyString } from '../src/services/money.js';

test('GST Compliance: Dataset contains exactly 100 enterprise scenarios', () => {
  assert.equal(GST_COMPLIANCE_SCENARIOS.length, 100);
});

test('GST Compliance: Supplier details match Brightloop registered profile', () => {
  for (const s of GST_COMPLIANCE_SCENARIOS) {
    assert.equal(s.supplier.gstin, COMPANY_GST_PROFILE.gstin);
    assert.equal(s.supplier.stateCode, COMPANY_GST_PROFILE.stateCode);
    assert.equal(s.supplier.legalName, COMPANY_GST_PROFILE.companyName);
  }
});

test('GST Compliance: Intra-state vs Inter-state tax allocation logic', () => {
  for (const s of GST_COMPLIANCE_SCENARIOS) {
    if (s.transactionType === 'EXPORT_LUT') {
      assert.equal(s.taxBreakdown.taxTotal, '0.00');
      assert.equal(s.taxBreakdown.cgstAmount, '0.00');
      assert.equal(s.taxBreakdown.sgstAmount, '0.00');
      assert.equal(s.taxBreakdown.igstAmount, '0.00');
      assert.ok(s.lutNumber);
    } else if (s.transactionType === 'B2B_INTRA_STATE') {
      assert.equal(s.recipient.stateCode, COMPANY_GST_PROFILE.stateCode);
      assert.equal(s.taxBreakdown.cgstRate, '9.00');
      assert.equal(s.taxBreakdown.sgstRate, '9.00');
      assert.equal(s.taxBreakdown.igstAmount, '0.00');
      assert.equal(s.taxBreakdown.cgstAmount, s.taxBreakdown.sgstAmount);
      const combinedTax = moneyString(parseFloat(s.taxBreakdown.cgstAmount) + parseFloat(s.taxBreakdown.sgstAmount));
      assert.equal(combinedTax, s.taxBreakdown.taxTotal);
    } else if (s.transactionType === 'B2B_INTER_STATE') {
      assert.notEqual(s.recipient.stateCode, COMPANY_GST_PROFILE.stateCode);
      assert.equal(s.taxBreakdown.cgstAmount, '0.00');
      assert.equal(s.taxBreakdown.sgstAmount, '0.00');
      assert.equal(s.taxBreakdown.igstRate, '18.00');
      assert.equal(s.taxBreakdown.igstAmount, s.taxBreakdown.taxTotal);
    }
  }
});

test('GST Compliance: Financial arithmetic strictly holds for all 100 scenarios', () => {
  for (const s of GST_COMPLIANCE_SCENARIOS) {
    const base = parseFloat(s.item.taxableValue);
    const tax = parseFloat(s.taxBreakdown.taxTotal);
    const total = parseFloat(s.totalAmount);

    const calculatedTotal = moneyString(base + tax);
    assert.equal(calculatedTotal, s.totalAmount, `Mismatch in scenario ${s.scenarioId}`);
  }
});

test('GST Compliance: Domestic B2B GSTIN structure and state code validation', () => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  for (const s of GST_COMPLIANCE_SCENARIOS) {
    if (s.transactionType === 'EXPORT_LUT') {
      assert.equal(s.recipient.gstin, null);
    } else {
      assert.ok(s.recipient.gstin, `Missing GSTIN for ${s.scenarioId}`);
      assert.match(s.recipient.gstin, gstinRegex, `Invalid GSTIN format: ${s.recipient.gstin}`);
      // First 2 digits of GSTIN must match recipient state code
      const statePrefix = s.recipient.gstin.slice(0, 2);
      assert.equal(statePrefix, s.recipient.stateCode, `GSTIN state prefix ${statePrefix} does not match stateCode ${s.recipient.stateCode}`);
    }
  }
});

test('GST Compliance: SAC codes belong to IT and software classification', () => {
  const validSacs = new Set(Object.values(SAC_CODES).map((item) => item.code));

  for (const s of GST_COMPLIANCE_SCENARIOS) {
    assert.ok(validSacs.has(s.item.sacCode), `Invalid SAC code ${s.item.sacCode} in ${s.scenarioId}`);
  }
});

test('GST Compliance: Place of supply correctly derived from recipient state', () => {
  for (const s of GST_COMPLIANCE_SCENARIOS) {
    if (s.transactionType === 'EXPORT_LUT') {
      assert.equal(s.recipient.placeOfSupply, '96-FOREIGN');
    } else {
      const expectedPos = `${s.recipient.stateCode}-${INDIAN_STATE_CODES[s.recipient.stateCode]}`;
      assert.equal(s.recipient.placeOfSupply, expectedPos);
    }
  }
});

test('GST Compliance: Reverse charge flag is false for standard IT SaaS billing', () => {
  for (const s of GST_COMPLIANCE_SCENARIOS) {
    assert.equal(s.reverseChargeApplicable, false);
  }
});
