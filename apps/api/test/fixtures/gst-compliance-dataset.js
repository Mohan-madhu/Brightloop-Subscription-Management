/**
 * GST Compliance Dataset for Brightloop Billing and Subscription Management.
 * Contains 100 enterprise GST transaction scenarios with deterministic tax calculations,
 * HSN/SAC classification, intra-state (CGST+SGST) vs inter-state (IGST) tax allocation,
 * and Indian GSTIN checksums.
 */

export const INDIAN_STATE_CODES = Object.freeze({
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '19': 'West Bengal',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '36': 'Telangana'
});

export const SAC_CODES = Object.freeze({
  SAAS_SUBSCRIPTION: { code: '998315', desc: 'Hosting and software infrastructure services', defaultRate: '18.00' },
  CLOUD_CONSULTING: { code: '998314', desc: 'Information technology consulting and support services', defaultRate: '18.00' },
  TECHNICAL_SUPPORT: { code: '998313', desc: 'Information technology network management services', defaultRate: '18.00' },
  DATA_PROCESSING: { code: '998316', desc: 'Data storage, database infrastructure, and processing services', defaultRate: '18.00' },
  MANAGED_SERVICES: { code: '998319', desc: 'Other IT and infrastructure management services', defaultRate: '18.00' },
  EDUCATION_TRAINING: { code: '999293', desc: 'Commercial training and developer onboarding coaching', defaultRate: '18.00' }
});

export const COMPANY_GST_PROFILE = Object.freeze({
  companyName: 'Brightloop Technologies Private Limited',
  gstin: '29AABCB1234F1Z5',
  stateCode: '29',
  stateName: 'Karnataka',
  registeredAddress: '42 Residency Road, Ashok Nagar, Bengaluru, Karnataka 560025, India'
});

/**
 * Builds 100 deterministic enterprise GST transaction test cases.
 */
export function buildGstComplianceDataset() {
  const scenarios = [];
  const stateKeys = Object.keys(INDIAN_STATE_CODES);
  const sacKeys = Object.keys(SAC_CODES);

  const pricePoints = [
    '499.00', '999.00', '1499.00', '2499.00', '4999.00',
    '7999.00', '9999.00', '14999.00', '24999.00', '49999.00',
    '99999.00', '149999.00', '250000.00', '500000.00', '1250000.00'
  ];

  for (let i = 1; i <= 100; i += 1) {
    const scenarioId = `GST-SCN-${String(i).padStart(4, '0')}`;
    const invoiceNumber = `BL-GST-2026-${String(i).padStart(4, '0')}`;
    const buyerStateCode = stateKeys[(i - 1) % stateKeys.length];
    const buyerStateName = INDIAN_STATE_CODES[buyerStateCode];
    const isIntraState = buyerStateCode === COMPANY_GST_PROFILE.stateCode;
    const isExport = i % 25 === 0; // Every 25th is a zero-rated export
    const sacItem = SAC_CODES[sacKeys[(i - 1) % sacKeys.length]];
    const baseAmount = pricePoints[(i - 1) % pricePoints.length];
    const baseCents = Math.round(parseFloat(baseAmount) * 100);

    let cgstAmount = '0.00';
    let sgstAmount = '0.00';
    let igstAmount = '0.00';
    let taxTotal = '0.00';
    let totalCents = baseCents;

    if (isExport) {
      // Zero-rated supply under Letter of Undertaking (LUT)
      taxTotal = '0.00';
    } else if (isIntraState) {
      // Karnataka to Karnataka: 9% CGST + 9% SGST
      const halfTaxCents = Math.round(baseCents * 0.09);
      cgstAmount = (halfTaxCents / 100).toFixed(2);
      sgstAmount = (halfTaxCents / 100).toFixed(2);
      const totalTaxCents = halfTaxCents * 2;
      taxTotal = (totalTaxCents / 100).toFixed(2);
      totalCents = baseCents + totalTaxCents;
    } else {
      // Karnataka to Other State: 18% IGST
      const igstCents = Math.round(baseCents * 0.18);
      igstAmount = (igstCents / 100).toFixed(2);
      taxTotal = igstAmount;
      totalCents = baseCents + igstCents;
    }

    const totalAmount = (totalCents / 100).toFixed(2);
    const buyerPan = `AABCT${String(1000 + i)}K`;
    const buyerGstin = isExport ? null : `${buyerStateCode}${buyerPan}1Z${(i % 9) + 1}`;

    scenarios.push({
      scenarioId,
      invoiceNumber,
      transactionType: isExport ? 'EXPORT_LUT' : (isIntraState ? 'B2B_INTRA_STATE' : 'B2B_INTER_STATE'),
      supplier: {
        legalName: COMPANY_GST_PROFILE.companyName,
        gstin: COMPANY_GST_PROFILE.gstin,
        stateCode: COMPANY_GST_PROFILE.stateCode,
        stateName: COMPANY_GST_PROFILE.stateName,
        address: COMPANY_GST_PROFILE.registeredAddress
      },
      recipient: {
        customerId: `cust_gst_${String(i).padStart(4, '0')}`,
        legalName: isExport ? `Global Systems International Inc. (#${i})` : `Enterprise Client ${i} Private Limited`,
        gstin: buyerGstin,
        pan: isExport ? null : buyerPan,
        stateCode: isExport ? '96' : buyerStateCode,
        stateName: isExport ? 'Foreign Entity' : buyerStateName,
        placeOfSupply: isExport ? '96-FOREIGN' : `${buyerStateCode}-${buyerStateName}`
      },
      item: {
        sacCode: sacItem.code,
        description: sacItem.desc,
        unitPrice: baseAmount,
        quantity: 1,
        taxableValue: baseAmount
      },
      taxBreakdown: {
        ratePercentage: isExport ? '0.00' : '18.00',
        isIntraState,
        isExport,
        cgstRate: isIntraState ? '9.00' : '0.00',
        cgstAmount,
        sgstRate: isIntraState ? '9.00' : '0.00',
        sgstAmount,
        igstRate: (!isIntraState && !isExport) ? '18.00' : '0.00',
        igstAmount,
        taxTotal
      },
      totalAmount,
      currency: 'INR',
      reverseChargeApplicable: false,
      invoiceDate: '2026-10-31',
      lutNumber: isExport ? 'AD290426001234M' : null
    });
  }

  return scenarios;
}

export const GST_COMPLIANCE_SCENARIOS = Object.freeze(buildGstComplianceDataset());
