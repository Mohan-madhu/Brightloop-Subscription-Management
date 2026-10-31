import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHART_OF_ACCOUNTS,
  ACCOUNTING_JOURNAL_VOUCHERS
} from './fixtures/accounting-journal-entries.js';
import { moneyString } from '../src/services/money.js';

test('Accounting Journal: Chart of accounts defines standard ledger structure', () => {
  const codes = Object.values(CHART_OF_ACCOUNTS).map((a) => a.code);
  assert.ok(codes.includes('1100')); // AR
  assert.ok(codes.includes('1010')); // Bank
  assert.ok(codes.includes('4000')); // Revenue
  assert.ok(codes.includes('4200')); // Discount
  assert.ok(codes.includes('2210')); // CGST
  assert.ok(codes.includes('2220')); // SGST
  assert.ok(codes.includes('2230')); // IGST
});

test('Accounting Journal: Dataset contains 50 double-entry vouchers', () => {
  assert.equal(ACCOUNTING_JOURNAL_VOUCHERS.length, 50);
});

test('Accounting Journal: Golden Rule - Debits strictly equal Credits on every voucher', () => {
  for (const voucher of ACCOUNTING_JOURNAL_VOUCHERS) {
    let totalDebitCents = 0;
    let totalCreditCents = 0;

    for (const line of voucher.lines) {
      const debitCents = Math.round(parseFloat(line.debit) * 100);
      const creditCents = Math.round(parseFloat(line.credit) * 100);

      assert.ok(debitCents >= 0, `Negative debit in voucher ${voucher.voucherNumber}`);
      assert.ok(creditCents >= 0, `Negative credit in voucher ${voucher.voucherNumber}`);
      assert.ok(
        debitCents === 0 || creditCents === 0,
        `Line cannot have both debit and credit in ${voucher.voucherNumber}`
      );

      totalDebitCents += debitCents;
      totalCreditCents += creditCents;
    }

    assert.equal(
      totalDebitCents,
      totalCreditCents,
      `Voucher ${voucher.voucherNumber} does not balance! Debit=${totalDebitCents} Credit=${totalCreditCents}`
    );
  }
});

test('Accounting Journal: Every journal line maps to an active account code', () => {
  const validCodes = new Set(Object.values(CHART_OF_ACCOUNTS).map((a) => a.code));

  for (const voucher of ACCOUNTING_JOURNAL_VOUCHERS) {
    for (const line of voucher.lines) {
      assert.ok(
        validCodes.has(line.accountCode),
        `Unrecognized account code ${line.accountCode} in voucher ${voucher.voucherNumber}`
      );
      assert.ok(line.description.length > 5);
    }
  }
});

test('Accounting Journal: Voucher number format is consistent and sequential', () => {
  const voucherNumRegex = /^JV-2026-\d{5}$/;

  for (const voucher of ACCOUNTING_JOURNAL_VOUCHERS) {
    assert.match(voucher.voucherNumber, voucherNumRegex);
  }
});
