/**
 * Double-Entry Accounting Journal Entry Vouchers for Brightloop Billing.
 *
 * Implements standard GAAP / Indian Accounting Standards (Ind AS 115) double-entry
 * bookkeeping rules for recurring subscription billing, tax accruals, payments, and discounts:
 *
 * Chart of Accounts:
 * - 1100 Accounts Receivable (Asset - Debit on invoice confirmation, Credit on payment)
 * - 1010 Bank / Payment Gateway Clearing (Asset - Debit on payment receipt)
 * - 4000 Subscription Revenue (Revenue - Credit on invoice confirmation)
 * - 4100 Add-on / Usage Revenue (Revenue - Credit on invoice confirmation)
 * - 4200 Sales Discounts Allowed (Contra Revenue - Debit on invoice confirmation)
 * - 2210 Output CGST Payable (Current Liability - Credit on invoice confirmation)
 * - 2220 Output SGST Payable (Current Liability - Credit on invoice confirmation)
 * - 2230 Output IGST Payable (Current Liability - Credit on invoice confirmation)
 * - 2300 Deferred / Unearned Revenue (Current Liability - Credit on advance collection)
 */

export const CHART_OF_ACCOUNTS = Object.freeze({
  ACCOUNTS_RECEIVABLE: { code: '1100', name: 'Accounts Receivable', type: 'ASSET', normalBalance: 'DEBIT' },
  BANK_CLEARING: { code: '1010', name: 'Payment Gateway Clearing Account', type: 'ASSET', normalBalance: 'DEBIT' },
  SUBSCRIPTION_REVENUE: { code: '4000', name: 'Subscription SaaS Revenue', type: 'REVENUE', normalBalance: 'CREDIT' },
  USAGE_REVENUE: { code: '4100', name: 'Add-on & Usage Revenue', type: 'REVENUE', normalBalance: 'CREDIT' },
  SALES_DISCOUNT: { code: '4200', name: 'Sales Discounts Allowed', type: 'CONTRA_REVENUE', normalBalance: 'DEBIT' },
  OUTPUT_CGST: { code: '2210', name: 'Output CGST Payable', type: 'LIABILITY', normalBalance: 'CREDIT' },
  OUTPUT_SGST: { code: '2220', name: 'Output SGST Payable', type: 'LIABILITY', normalBalance: 'CREDIT' },
  OUTPUT_IGST: { code: '2230', name: 'Output IGST Payable', type: 'LIABILITY', normalBalance: 'CREDIT' },
  DEFERRED_REVENUE: { code: '2300', name: 'Unearned / Deferred Revenue', type: 'LIABILITY', normalBalance: 'CREDIT' }
});

/**
 * Builds 50 deterministic double-entry accounting journal vouchers.
 */
export function buildAccountingJournalEntries() {
  const vouchers = [];

  const invoiceBases = [
    { subtotal: '1000.00', discount: '100.00', taxType: 'INTRA', cgst: '81.00', sgst: '81.00', total: '1062.00' },
    { subtotal: '2500.00', discount: '0.00', taxType: 'INTER', igst: '450.00', total: '2950.00' },
    { subtotal: '5000.00', discount: '500.00', taxType: 'INTRA', cgst: '405.00', sgst: '405.00', total: '5310.00' },
    { subtotal: '10000.00', discount: '1000.00', taxType: 'INTER', igst: '1620.00', total: '10620.00' },
    { subtotal: '20000.00', discount: '0.00', taxType: 'INTRA', cgst: '1800.00', sgst: '1800.00', total: '23600.00' }
  ];

  for (let i = 1; i <= 50; i += 1) {
    const voucherNumber = `JV-2026-${String(i).padStart(5, '0')}`;
    const invoiceId = `inv_acct_${String(i).padStart(4, '0')}`;
    const paymentId = `pay_acct_${String(i).padStart(4, '0')}`;
    const base = invoiceBases[(i - 1) % invoiceBases.length];
    const isPaymentVoucher = i % 2 === 0;

    if (!isPaymentVoucher) {
      // INVOICE CONFIRMATION VOUCHER
      // Debits: Accounts Receivable (total), Sales Discount (discount)
      // Credits: Subscription Revenue (subtotal), Tax Liabilities (CGST/SGST or IGST)
      const lines = [];

      // 1. Debit Accounts Receivable for invoice total amount
      lines.push({
        lineId: `jvl_${i}_1`,
        accountCode: CHART_OF_ACCOUNTS.ACCOUNTS_RECEIVABLE.code,
        accountName: CHART_OF_ACCOUNTS.ACCOUNTS_RECEIVABLE.name,
        debit: base.total,
        credit: '0.00',
        description: `Receivable recognized for invoice ${invoiceId}`
      });

      // 2. Debit Sales Discount (if any)
      if (parseFloat(base.discount) > 0) {
        lines.push({
          lineId: `jvl_${i}_2`,
          accountCode: CHART_OF_ACCOUNTS.SALES_DISCOUNT.code,
          accountName: CHART_OF_ACCOUNTS.SALES_DISCOUNT.name,
          debit: base.discount,
          credit: '0.00',
          description: `Promotional coupon applied to invoice ${invoiceId}`
        });
      }

      // 3. Credit Subscription Revenue for gross subtotal
      lines.push({
        lineId: `jvl_${i}_3`,
        accountCode: CHART_OF_ACCOUNTS.SUBSCRIPTION_REVENUE.code,
        accountName: CHART_OF_ACCOUNTS.SUBSCRIPTION_REVENUE.name,
        debit: '0.00',
        credit: base.subtotal,
        description: `Revenue accrual for subscription period`
      });

      // 4. Credit Tax Liabilities
      if (base.taxType === 'INTRA') {
        lines.push({
          lineId: `jvl_${i}_4`,
          accountCode: CHART_OF_ACCOUNTS.OUTPUT_CGST.code,
          accountName: CHART_OF_ACCOUNTS.OUTPUT_CGST.name,
          debit: '0.00',
          credit: base.cgst,
          description: `Output CGST 9% accrued`
        });
        lines.push({
          lineId: `jvl_${i}_5`,
          accountCode: CHART_OF_ACCOUNTS.OUTPUT_SGST.code,
          accountName: CHART_OF_ACCOUNTS.OUTPUT_SGST.name,
          debit: '0.00',
          credit: base.sgst,
          description: `Output SGST 9% accrued`
        });
      } else {
        lines.push({
          lineId: `jvl_${i}_6`,
          accountCode: CHART_OF_ACCOUNTS.OUTPUT_IGST.code,
          accountName: CHART_OF_ACCOUNTS.OUTPUT_IGST.name,
          debit: '0.00',
          credit: base.igst,
          description: `Output IGST 18% accrued`
        });
      }

      vouchers.push({
        voucherNumber,
        voucherType: 'INVOICE_RECOGNITION',
        referenceId: invoiceId,
        voucherDate: '2026-10-31',
        currency: 'INR',
        lines
      });
    } else {
      // PAYMENT SETTLEMENT VOUCHER
      // Debits: Bank Clearing Account (total)
      // Credits: Accounts Receivable (total)
      const lines = [
        {
          lineId: `jvl_${i}_1`,
          accountCode: CHART_OF_ACCOUNTS.BANK_CLEARING.code,
          accountName: CHART_OF_ACCOUNTS.BANK_CLEARING.name,
          debit: base.total,
          credit: '0.00',
          description: `Payment received via Razorpay settlement for payment ${paymentId}`
        },
        {
          lineId: `jvl_${i}_2`,
          accountCode: CHART_OF_ACCOUNTS.ACCOUNTS_RECEIVABLE.code,
          accountName: CHART_OF_ACCOUNTS.ACCOUNTS_RECEIVABLE.name,
          debit: '0.00',
          credit: base.total,
          description: `Clearance of receivable on invoice ${invoiceId}`
        }
      ];

      vouchers.push({
        voucherNumber,
        voucherType: 'PAYMENT_RECEIPT',
        referenceId: paymentId,
        voucherDate: '2026-10-31',
        currency: 'INR',
        lines
      });
    }
  }

  return vouchers;
}

export const ACCOUNTING_JOURNAL_VOUCHERS = Object.freeze(buildAccountingJournalEntries());
