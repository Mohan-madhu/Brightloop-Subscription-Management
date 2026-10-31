/**
 * GST Tax Exemption, SEZ Zero-Rating, and GST TDS (Section 51) Rules.
 *
 * Models Indian GST special tax treatments:
 * 1. SEZ Developer / SEZ Unit supply: Zero-rated without payment of tax under LUT (IGST 0%)
 * 2. Export of Services under LUT / Bond: Zero-rated without payment of tax
 * 3. Government / PSU entity transactions: Mandatory 2% GST TDS deduction (1% CGST + 1% SGST or 2% IGST)
 * 4. High Sea Sales / In-transit exemptions
 */

export const EXEMPTION_CATEGORIES = Object.freeze({
  SEZ_UNIT_LUT: {
    code: 'SEZ_LUT',
    label: 'Supply to SEZ Unit / Developer under LUT',
    applicableIgstRate: '0.00',
    requiresLut: true,
    requiresSezDeclaration: true
  },
  EXPORT_SERVICES_LUT: {
    code: 'EXPORT_LUT',
    label: 'Export of Services under LUT without IGST',
    applicableIgstRate: '0.00',
    requiresLut: true,
    requiresSezDeclaration: false
  },
  PSU_GOVT_TDS: {
    code: 'GOVT_TDS',
    label: 'Public Sector / Govt Entity with Section 51 GST TDS',
    applicableGstRate: '18.00',
    tdsRateTotal: '2.00',
    tdsCgstRate: '1.00',
    tdsSgstRate: '1.00',
    tdsIgstRate: '2.00',
    thresholdAmount: '250000.00' // TDS applies only if taxable contract > 2.5 Lakhs INR
  }
});

/**
 * Builds 50 deterministic tax exemption and special treatment scenarios.
 */
export function buildTaxExemptionScenarios() {
  const scenarios = [];
  const categories = Object.values(EXEMPTION_CATEGORIES);

  const taxableValues = [
    '50000.00', '100000.00', '200000.00', '300000.00', '500000.00',
    '750000.00', '1000000.00', '1500000.00', '2500000.00', '5000000.00'
  ];

  for (let i = 1; i <= 50; i += 1) {
    const category = categories[(i - 1) % categories.length];
    const taxableValue = taxableValues[(i - 1) % taxableValues.length];
    const taxableCents = Math.round(parseFloat(taxableValue) * 100);

    let taxTotalCents = 0;
    let tdsDeductionCents = 0;
    let netReceivableCents = taxableCents;

    if (category.code === 'SEZ_LUT' || category.code === 'EXPORT_LUT') {
      taxTotalCents = 0;
      tdsDeductionCents = 0;
      netReceivableCents = taxableCents;
    } else if (category.code === 'GOVT_TDS') {
      // 18% GST added
      taxTotalCents = Math.round(taxableCents * 0.18);
      const invoiceTotalCents = taxableCents + taxTotalCents;

      // Check if exceeds threshold of 2.5 Lakhs (25000000 cents)
      if (taxableCents > 25000000) {
        // 2% TDS on taxable value (excluding tax)
        tdsDeductionCents = Math.round(taxableCents * 0.02);
      } else {
        tdsDeductionCents = 0;
      }

      netReceivableCents = invoiceTotalCents - tdsDeductionCents;
    }

    scenarios.push({
      scenarioId: `EXM-SCN-${String(i).padStart(4, '0')}`,
      categoryCode: category.code,
      label: category.label,
      taxableValue,
      taxTotalFormatted: (taxTotalCents / 100).toFixed(2),
      invoiceTotalFormatted: ((taxableCents + taxTotalCents) / 100).toFixed(2),
      tdsDeductedFormatted: (tdsDeductionCents / 100).toFixed(2),
      netReceivableFormatted: (netReceivableCents / 100).toFixed(2),
      lutNumber: category.requiresLut ? 'AD290426009988X' : null,
      sezApprovalReference: category.requiresSezDeclaration ? `SEZ/BLR/${202600 + i}` : null
    });
  }

  return scenarios;
}

export const TAX_EXEMPTION_SCENARIOS = Object.freeze(buildTaxExemptionScenarios());
