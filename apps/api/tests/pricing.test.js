import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateLineSubtotal, calculateDiscount, calculateTotals, round } from '../src/utils/pricing.js';

describe('Pricing Engine Verification', () => {
  test('calculates base line subtotal without adjustments', () => {
    const item = { salesPrice: 1000, quantity: 2 };
    const result = calculateLineSubtotal(item);
    assert.equal(result.unitPrice, 1000);
    assert.equal(result.quantity, 2);
    assert.equal(result.subtotal, 2000);
  });

  test('calculates line subtotal with variant price adjustment and add-ons', () => {
    // Base 1000, Odoo variant +560, SLA Add-on +1200 => Unit 2760 * 3 = 8280
    const item = {
      salesPrice: 1000,
      variantPriceAdjustment: 560,
      addOns: [{ price: 1200 }],
      quantity: 3
    };
    const result = calculateLineSubtotal(item);
    assert.equal(result.unitPrice, 2760);
    assert.equal(result.quantity, 3);
    assert.equal(result.subtotal, 8280);
  });

  test('calculates percentage discount correctly', () => {
    const discount = {
      status: 'ACTIVE',
      type: 'PERCENTAGE',
      value: 10,
      minPurchase: 1000,
      maxUses: 100,
      usedCount: 5
    };
    const result = calculateDiscount(5000, 1, discount);
    assert.equal(result.discountAmount, 500);
    assert.equal(result.appliedDiscount.code, discount.code);
  });

  test('rejects expired or exhausted discount', () => {
    const exhausted = {
      status: 'ACTIVE',
      type: 'PERCENTAGE',
      value: 10,
      maxUses: 10,
      usedCount: 10
    };
    const result = calculateDiscount(5000, 1, exhausted);
    assert.equal(result.discountAmount, 0);
    assert.equal(result.appliedDiscount, null);
  });

  test('calculates full totals with tax-exclusive 18% GST', () => {
    // Subtotal: 10,000. Discount 10% = 1,000. Taxable: 9,000.
    // 18% Tax on 9,000 = 1,620. Total = 10,620.
    const items = [
      { salesPrice: 5000, quantity: 2 }
    ];
    const discount = {
      status: 'ACTIVE',
      type: 'PERCENTAGE',
      value: 10,
      maxUses: 100,
      usedCount: 0
    };
    const totals = calculateTotals({ items, discount, taxRate: 18.0 });
    assert.equal(totals.subtotal, 10000);
    assert.equal(totals.discountAmount, 1000);
    assert.equal(totals.taxableAmount, 9000);
    assert.equal(totals.taxAmount, 1620);
    assert.equal(totals.totalAmount, 10620);
  });
});
