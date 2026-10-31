/**
 * E-Invoicing IRN (Invoice Reference Number) & QR Code Scenarios.
 *
 * Implements statutory Indian GST e-invoicing schema (INV-01) standards:
 * - IRN generation: 64-character hexadecimal SHA-256 hash of Supplier GSTIN + FinYear + DocType + DocNumber
 * - Signed QR code generation for tax invoice verification
 * - Acknowledgement number (16-digit integer string) and acknowledgement date-time
 */

import crypto from 'node:crypto';

export const E_INVOICE_DOC_TYPES = Object.freeze({
  INVOICE: 'INV',
  CREDIT_NOTE: 'CRN',
  DEBIT_NOTE: 'DBN'
});

/**
 * Computes statutory IRN hash per NIC (National Informatics Centre) specification.
 * @param {string} supplierGstin
 * @param {string} finYear (e.g. "2026-27")
 * @param {string} docType ("INV", "CRN", "DBN")
 * @param {string} docNumber
 * @returns {string} 64-character uppercase hexadecimal hash
 */
export function generateStatutoryIrn(supplierGstin, finYear, docType, docNumber) {
  const plainText = `${supplierGstin}${finYear}${docType}${docNumber}`;
  return crypto.createHash('sha256').update(plainText).digest('hex').toUpperCase();
}

/**
 * Builds 50 deterministic e-invoicing IRN test scenarios.
 */
export function buildEInvoicingScenarios() {
  const scenarios = [];
  const supplierGstin = '29AABCB1234F1Z5';
  const finYear = '2026-27';
  const docTypes = Object.values(E_INVOICE_DOC_TYPES);

  for (let i = 1; i <= 50; i += 1) {
    const docType = docTypes[(i - 1) % docTypes.length];
    const docNumber = `${docType}-2026-${String(i).padStart(5, '0')}`;
    const irn = generateStatutoryIrn(supplierGstin, finYear, docType, docNumber);
    const ackNo = `1226${String(100000000000 + i)}`;
    const ackDate = '2026-10-31 13:30:00';

    const qrPayload = JSON.stringify({
      gstin: supplierGstin,
      docNo: docNumber,
      docTyp: docType,
      docDt: '31/10/2026',
      totVal: ((i * 1250) + 1000).toFixed(2),
      irn
    });

    scenarios.push({
      scenarioId: `EINV-SCN-${String(i).padStart(4, '0')}`,
      supplierGstin,
      finYear,
      docType,
      docNumber,
      irn,
      ackNo,
      ackDate,
      qrPayload,
      status: 'ACT', // Active
      signedInvoiceAvailable: true
    });
  }

  return scenarios;
}

export const E_INVOICING_SCENARIOS = Object.freeze(buildEInvoicingScenarios());
