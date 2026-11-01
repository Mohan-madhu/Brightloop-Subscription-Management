/**
 * Comprehensive Credit Note & Tax Reversal Scenarios for Brightloop Billing.
 *
 * Implements GST Section 34 of CGST Act 2017 compliant Credit Notes:
 * 1. Partial refund / service deficiency credit notes.
 * 2. Full invoice reversal credit notes.
 * 3. Volume rebate / post-sale discount credit notes.
 * 4. Output tax liability reduction (CGST/SGST/IGST reversal).
 */

export const CREDIT_NOTE_REASONS = Object.freeze({
  SERVICE_DEFICIENCY: '01-Deficiency in services rendered',
  POST_SALE_DISCOUNT: '02-Post-sale volume rebate / discount',
  INVOICE_CORRECTION: '03-Correction in invoice taxable value',
  SUBSCRIPTION_DOWNGRADE: '04-Mid-cycle subscription downgrade proration',
  FULL_CANCELLATION: '05-Immediate service termination and refund'
});

/**
 * Builds 50 deterministic credit note scenarios.
 */
export function buildCreditNoteScenarios() {
  const scenarios = [];
  const reasons = Object.values(CREDIT_NOTE_REASONS);

  const originalInvoices = [
    { id: 'inv_bl_1001', base: '1000.00', taxType: 'INTRA', cgst: '90.00', sgst: '90.00', total: '1180.00' },
    { id: 'inv_bl_1002', base: '2500.00', taxType: 'INTER', igst: '450.00', total: '2950.00' },
    { id: 'inv_bl_1003', base: '5000.00', taxType: 'INTRA', cgst: '450.00', sgst: '450.00', total: '5900.00' },
    { id: 'inv_bl_1004', base: '10000.00', taxType: 'INTER', igst: '1800.00', total: '11800.00' },
    { id: 'inv_bl_1005', base: '25000.00', taxType: 'INTRA', cgst: '2250.00', sgst: '2250.00', total: '29500.00' }
  ];

  for (let i = 1; i <= 50; i += 1) {
    const orig = originalInvoices[(i - 1) % originalInvoices.length];
    const creditNoteNumber = `CN-2026-${String(i).padStart(5, '0')}`;
    const reason = reasons[(i - 1) % reasons.length];
    const isFullReversal = i % 5 === 0;

    let baseCredit = '0.00';
    let cgstCredit = '0.00';
    let sgstCredit = '0.00';
    let igstCredit = '0.00';
    let totalCredit = '0.00';

    if (isFullReversal) {
      // 100% reversal
      baseCredit = orig.base;
      if (orig.taxType === 'INTRA') {
        cgstCredit = orig.cgst;
        sgstCredit = orig.sgst;
        totalCredit = orig.total;
      } else {
        igstCredit = orig.igst;
        totalCredit = orig.total;
      }
    } else {
      // Partial credit (e.g. 20% or fixed service SLA breach)
      const fraction = 0.25;
      const baseCents = Math.round(parseFloat(orig.base) * 100 * fraction);
      baseCredit = (baseCents / 100).toFixed(2);

      if (orig.taxType === 'INTRA') {
        const halfTaxCents = Math.round(baseCents * 0.09);
        cgstCredit = (halfTaxCents / 100).toFixed(2);
        sgstCredit = (halfTaxCents / 100).toFixed(2);
        const totalCents = baseCents + (halfTaxCents * 2);
        totalCredit = (totalCents / 100).toFixed(2);
      } else {
        const igstCents = Math.round(baseCents * 0.18);
        igstCredit = (igstCents / 100).toFixed(2);
        totalCredit = ((baseCents + igstCents) / 100).toFixed(2);
      }
    }

    scenarios.push({
      creditNoteId: `cn_scn_${String(i).padStart(4, '0')}`,
      creditNoteNumber,
      originalInvoiceId: orig.id,
      originalInvoiceTotal: orig.total,
      customerId: `cust_cn_${String((i % 20) + 1).padStart(4, '0')}`,
      issueDate: '2026-10-31',
      reason,
      isFullReversal,
      taxType: orig.taxType,
      reversalAmounts: {
        taxableValue: baseCredit,
        cgst: cgstCredit,
        sgst: sgstCredit,
        igst: igstCredit,
        totalCredit
      },
      currency: 'INR',
      status: 'ISSUED'
    });
  }

  return scenarios;
}

export const CREDIT_NOTE_SCENARIOS = Object.freeze(buildCreditNoteScenarios());
