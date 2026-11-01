import test from 'node:test';
import assert from 'node:assert/strict';
import {
  E_INVOICE_DOC_TYPES,
  E_INVOICING_SCENARIOS,
  generateStatutoryIrn
} from './fixtures/e-invoicing-irn-scenarios.js';

test('E-Invoicing IRN: Dataset contains 50 statutory scenarios', () => {
  assert.equal(E_INVOICING_SCENARIOS.length, 50);
});

test('E-Invoicing IRN: All IRNs are exactly 64 uppercase hexadecimal characters', () => {
  const hex64Regex = /^[A-F0-9]{64}$/;

  for (const scn of E_INVOICING_SCENARIOS) {
    assert.match(scn.irn, hex64Regex, `Invalid IRN format in ${scn.scenarioId}: ${scn.irn}`);
    assert.equal(scn.irn.length, 64);
  }
});

test('E-Invoicing IRN: Statutory hash calculation is strictly deterministic', () => {
  for (const scn of E_INVOICING_SCENARIOS) {
    const computedIrn = generateStatutoryIrn(
      scn.supplierGstin,
      scn.finYear,
      scn.docType,
      scn.docNumber
    );

    assert.equal(computedIrn, scn.irn, `Mismatch for ${scn.scenarioId}`);
  }
});

test('E-Invoicing IRN: Acknowledgement number is a 16-digit integer string', () => {
  const ackRegex = /^\d{16}$/;

  for (const scn of E_INVOICING_SCENARIOS) {
    assert.match(scn.ackNo, ackRegex);
    assert.equal(scn.status, 'ACT');
    assert.ok(scn.qrPayload);
  }
});

test('E-Invoicing IRN: Document types map strictly to INV, CRN, or DBN', () => {
  const allowed = new Set(Object.values(E_INVOICE_DOC_TYPES));

  for (const scn of E_INVOICING_SCENARIOS) {
    assert.ok(allowed.has(scn.docType));
  }
});
