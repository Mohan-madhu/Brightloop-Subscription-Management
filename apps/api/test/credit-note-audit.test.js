import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CREDIT_NOTE_SCENARIOS,
  CREDIT_NOTE_REASONS
} from './fixtures/credit-note-scenarios.js';
import { moneyString } from '../src/services/money.js';

test('Credit Notes: Dataset contains exactly 50 credit note scenarios', () => {
  assert.equal(CREDIT_NOTE_SCENARIOS.length, 50);
});

test('Credit Notes: Reversal amounts never exceed original invoice total', () => {
  for (const cn of CREDIT_NOTE_SCENARIOS) {
    const origTotal = parseFloat(cn.originalInvoiceTotal);
    const creditTotal = parseFloat(cn.reversalAmounts.totalCredit);

    assert.ok(
      creditTotal <= origTotal,
      `Credit note ${cn.creditNoteNumber} exceeds original invoice: ${creditTotal} > ${origTotal}`
    );

    if (cn.isFullReversal) {
      assert.equal(cn.reversalAmounts.totalCredit, cn.originalInvoiceTotal);
    }
  }
});

test('Credit Notes: Tax reversal arithmetic strictly holds for all scenarios', () => {
  for (const cn of CREDIT_NOTE_SCENARIOS) {
    const base = parseFloat(cn.reversalAmounts.taxableValue);
    const cgst = parseFloat(cn.reversalAmounts.cgst);
    const sgst = parseFloat(cn.reversalAmounts.sgst);
    const igst = parseFloat(cn.reversalAmounts.igst);
    const total = parseFloat(cn.reversalAmounts.totalCredit);

    if (cn.taxType === 'INTRA') {
      assert.equal(cgst, sgst, `CGST and SGST must be equal in ${cn.creditNoteNumber}`);
      assert.equal(igst, 0.00);
      const computedTotal = moneyString(base + cgst + sgst);
      assert.equal(computedTotal, cn.reversalAmounts.totalCredit);
    } else {
      assert.equal(cgst, 0.00);
      assert.equal(sgst, 0.00);
      const computedTotal = moneyString(base + igst);
      assert.equal(computedTotal, cn.reversalAmounts.totalCredit);
    }
  }
});

test('Credit Notes: Reason codes map to recognized GST Section 34 categories', () => {
  const recognizedReasons = new Set(Object.values(CREDIT_NOTE_REASONS));

  for (const cn of CREDIT_NOTE_SCENARIOS) {
    assert.ok(
      recognizedReasons.has(cn.reason),
      `Unknown reason code in ${cn.creditNoteNumber}: ${cn.reason}`
    );
  }
});

test('Credit Notes: Numbering adheres to standard prefix format', () => {
  const regex = /^CN-2026-\d{5}$/;

  for (const cn of CREDIT_NOTE_SCENARIOS) {
    assert.match(cn.creditNoteNumber, regex);
  }
});
