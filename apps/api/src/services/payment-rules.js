import { roundMoney } from './money.js';

export function allocatePaymentToInvoice({ balance, amount }) {
  const currentBalance = roundMoney(balance);
  const paymentAmount = roundMoney(amount);
  if (paymentAmount.lte(0)) {
    const error = new Error('Payment amount must be greater than zero.');
    error.code = 'INVALID_AMOUNT';
    throw error;
  }
  if (currentBalance.lte(0)) {
    const error = new Error('This invoice has no outstanding balance.');
    error.code = 'NOTHING_OUTSTANDING';
    throw error;
  }
  if (paymentAmount.gt(currentBalance)) {
    const error = new Error(`Payment exceeds the outstanding balance of INR ${currentBalance.toFixed(2)}.`);
    error.code = 'OVERPAYMENT_NOT_SUPPORTED';
    throw error;
  }
  const newBalance = roundMoney(currentBalance.minus(paymentAmount));
  return {
    newBalance,
    status: newBalance.eq(0) ? 'PAID' : 'PARTIALLY_PAID'
  };
}
