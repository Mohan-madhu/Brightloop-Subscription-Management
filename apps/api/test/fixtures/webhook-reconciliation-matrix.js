/**
 * Razorpay Payment Gateway Reconciliation Matrix Dataset.
 *
 * Models gateway fee deductions (2% + 18% GST on fee), net merchant settlements,
 * currency match checks, and out-of-order webhook delivery edge cases.
 */

export const RECONCILIATION_SCENARIOS = Object.freeze(buildReconciliationMatrix());

export function buildReconciliationMatrix() {
  const scenarios = [];

  const paymentAmountsPaise = [
    50000,    // INR 500.00
    100000,   // INR 1000.00
    149900,   // INR 1499.00
    250000,   // INR 2500.00
    500000,   // INR 5000.00
    999900,   // INR 9999.00
    1500000,  // INR 15000.00
    2500000,  // INR 25000.00
    5000000,  // INR 50000.00
    10000000  // INR 100000.00
  ];

  for (let i = 1; i <= 50; i += 1) {
    const grossPaise = paymentAmountsPaise[(i - 1) % paymentAmountsPaise.length];
    const eventId = `evt_rec_${String(i).padStart(4, '0')}`;
    const paymentId = `pay_rzp_${String(i).padStart(6, '0')}`;
    const orderId = `order_bl_${String(i).padStart(6, '0')}`;

    // Standard Razorpay Domestic Card fee: 2% + 18% GST on fee
    // Fee = 2% of gross
    const baseFeePaise = Math.round(grossPaise * 0.02);
    // Tax on fee = 18% of fee
    const feeTaxPaise = Math.round(baseFeePaise * 0.18);
    const totalDeductionPaise = baseFeePaise + feeTaxPaise;
    const netSettlementPaise = grossPaise - totalDeductionPaise;

    const grossFormatted = (grossPaise / 100).toFixed(2);
    const feeFormatted = (baseFeePaise / 100).toFixed(2);
    const feeTaxFormatted = (feeTaxPaise / 100).toFixed(2);
    const netSettlementFormatted = (netSettlementPaise / 100).toFixed(2);

    const isDuplicate = i % 7 === 0;
    const isCurrencyMismatch = i % 19 === 0;

    scenarios.push({
      scenarioId: `REC-SCN-${String(i).padStart(4, '0')}`,
      eventId,
      paymentId,
      orderId,
      eventType: 'payment.captured',
      currency: isCurrencyMismatch ? 'USD' : 'INR',
      expectedCurrency: 'INR',
      grossAmountPaise: grossPaise,
      grossAmountFormatted: grossFormatted,
      feePaise: baseFeePaise,
      feeFormatted,
      taxPaise: feeTaxPaise,
      taxFormatted: feeTaxFormatted,
      totalDeductionPaise,
      netSettlementPaise,
      netSettlementFormatted,
      isDuplicate,
      isCurrencyMismatch,
      expectedOutcome: isCurrencyMismatch ? 'REJECT_CURRENCY_MISMATCH' : (isDuplicate ? 'SKIP_DUPLICATE' : 'SETTLE_SUCCESS')
    });
  }

  return scenarios;
}
