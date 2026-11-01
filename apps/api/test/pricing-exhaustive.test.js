import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePricing,
  discountMatchesLines,
  discountReduction,
  isDiscountEligible,
  pricingForApi,
  resolveCatalogUnitPrice,
  selectDiscount
} from '../src/services/pricing.js';
import { dec, moneyString, roundMoney, sumMoney, ZERO } from '../src/services/money.js';

test('Pricing: Single line without discount or tax', () => {
  const lines = [
    { key: 'line_1', description: 'Basic Compute', productId: 'p1', quantity: 1, unitPrice: '100.00', taxes: [] }
  ];
  const result = calculatePricing({ lines });
  assert.equal(moneyString(result.subtotal), '100.00');
  assert.equal(moneyString(result.discountTotal), '0.00');
  assert.equal(moneyString(result.taxTotal), '0.00');
  assert.equal(moneyString(result.total), '100.00');
  assert.equal(result.discount, null);
});

test('Pricing: Multi-quantity line calculations', () => {
  const lines = [
    { key: 'line_1', description: 'License Seat', productId: 'p1', quantity: 15, unitPrice: '45.50', taxes: [] }
  ];
  const result = calculatePricing({ lines });
  // 15 * 45.50 = 682.50
  assert.equal(moneyString(result.subtotal), '682.50');
  assert.equal(moneyString(result.total), '682.50');
});

test('Pricing: Exact half-up rounding on fractional tax amounts', () => {
  // Line base = 0.05 * 1 = 0.05. Tax 18% = 0.009 -> rounds to 0.01
  const l1 = [{ key: '1', description: 'T1', productId: 'p', quantity: 1, unitPrice: '0.05', taxes: [{ name: 'GST', rate: '18.00' }] }];
  const r1 = calculatePricing({ lines: l1 });
  assert.equal(moneyString(r1.lines[0].taxes[0].amount), '0.01');
  assert.equal(moneyString(r1.total), '0.06');

  // Line base = 0.025 * 1 = 0.03 rounded base. Tax 10% = 0.003 -> rounds to 0.00
  const l2 = [{ key: '2', description: 'T2', productId: 'p', quantity: 1, unitPrice: '0.02', taxes: [{ name: 'GST', rate: '10.00' }] }];
  const r2 = calculatePricing({ lines: l2 });
  assert.equal(moneyString(r2.lines[0].taxes[0].amount), '0.00');
  assert.equal(moneyString(r2.total), '0.02');
});

test('Pricing: Multiple lines with individual GST taxes (CGST 9% + SGST 9%)', () => {
  const lines = [
    {
      key: 'base_plan',
      description: 'Monthly Cloud Platform',
      productId: 'prod_cloud',
      quantity: 1,
      unitPrice: '1000.00',
      taxes: [
        { name: 'CGST 9%', rate: '9.00' },
        { name: 'SGST 9%', rate: '9.00' }
      ]
    },
    {
      key: 'extra_storage',
      description: 'Extra Block Storage (100GB)',
      productId: 'prod_storage',
      quantity: 2,
      unitPrice: '250.00',
      taxes: [
        { name: 'CGST 9%', rate: '9.00' },
        { name: 'SGST 9%', rate: '9.00' }
      ]
    }
  ];

  const result = calculatePricing({ lines });
  // Subtotal = 1000 + (2 * 250) = 1500.00
  assert.equal(moneyString(result.subtotal), '1500.00');
  assert.equal(moneyString(result.discountTotal), '0.00');

  // Line 1: 1000.00. CGST = 90.00, SGST = 90.00, taxTotal = 180.00
  assert.equal(moneyString(result.lines[0].taxTotal), '180.00');

  // Line 2: 500.00. CGST = 45.00, SGST = 45.00, taxTotal = 90.00
  assert.equal(moneyString(result.lines[1].taxTotal), '90.00');

  // Overall taxTotal = 270.00
  assert.equal(moneyString(result.taxTotal), '270.00');
  // Total = 1500 + 270 = 1770.00
  assert.equal(moneyString(result.total), '1770.00');
});

test('Pricing: Proportional fixed discount allocation across lines', () => {
  const lines = [
    { key: 'line_a', description: 'Product A', productId: 'pA', quantity: 1, unitPrice: '600.00', taxes: [] },
    { key: 'line_b', description: 'Product B', productId: 'pB', quantity: 1, unitPrice: '400.00', taxes: [] }
  ];
  // Subtotal = 1000.00
  // Discount = 100.00 fixed
  // Line A proportion: 600/1000 * 100 = 60.00
  // Line B proportion: 400/1000 * 100 = 40.00
  const result = calculatePricing({
    lines,
    discount: { id: 'd1', code: 'SAVE100', kind: 'FIXED', amount: '100.00', active: true, targets: [] }
  });

  assert.equal(moneyString(result.discountTotal), '100.00');
  assert.equal(moneyString(result.lines[0].discountAmount), '60.00');
  assert.equal(moneyString(result.lines[0].lineTotal), '540.00');
  assert.equal(moneyString(result.lines[1].discountAmount), '40.00');
  assert.equal(moneyString(result.lines[1].lineTotal), '360.00');
  assert.equal(moneyString(result.total), '900.00');
});

test('Pricing: Proportional allocation with rounding pennies (3 equal lines)', () => {
  const lines = [
    { key: 'l1', description: 'Item 1', productId: 'p1', quantity: 1, unitPrice: '100.00', taxes: [] },
    { key: 'l2', description: 'Item 2', productId: 'p2', quantity: 1, unitPrice: '100.00', taxes: [] },
    { key: 'l3', description: 'Item 3', productId: 'p3', quantity: 1, unitPrice: '100.00', taxes: [] }
  ];
  // Subtotal = 300.00. Discount = 10.00.
  // 10 / 3 = 3.3333...
  // Line 1: 3.33
  // Line 2: 3.33
  // Line 3: 10.00 - (3.33 + 3.33) = 3.34
  const result = calculatePricing({
    lines,
    discount: { id: 'd_ten', code: 'TEN', kind: 'FIXED', amount: '10.00', active: true, targets: [] }
  });

  assert.equal(moneyString(result.discountTotal), '10.00');
  assert.equal(moneyString(result.lines[0].discountAmount), '3.33');
  assert.equal(moneyString(result.lines[1].discountAmount), '3.33');
  assert.equal(moneyString(result.lines[2].discountAmount), '3.34');
  assert.equal(
    result.lines[0].discountAmount.plus(result.lines[1].discountAmount).plus(result.lines[2].discountAmount).toFixed(2),
    '10.00'
  );
});

test('Pricing: Tax is calculated AFTER discount reduction on each line', () => {
  const lines = [
    {
      key: 'service',
      description: 'Consulting',
      productId: 'p_srv',
      quantity: 1,
      unitPrice: '1000.00',
      taxes: [{ name: 'Service Tax 18%', rate: '18.00' }]
    }
  ];
  // Subtotal = 1000.00. 50% discount = 500.00.
  // Discounted lineTotal = 500.00.
  // Tax 18% of 500.00 = 90.00 (NOT 18% of 1000 = 180).
  // Total = 500.00 + 90.00 = 590.00.
  const result = calculatePricing({
    lines,
    discount: { id: 'd50', code: 'HALF', kind: 'PERCENTAGE', amount: '50.00', active: true, targets: [] }
  });

  assert.equal(moneyString(result.subtotal), '1000.00');
  assert.equal(moneyString(result.discountTotal), '500.00');
  assert.equal(moneyString(result.taxTotal), '90.00');
  assert.equal(moneyString(result.total), '590.00');
});

test('Pricing: 100% discount reduces subtotal to zero and tax to zero', () => {
  const lines = [
    { key: 'srv', description: 'Promo License', productId: 'p1', quantity: 2, unitPrice: '499.00', taxes: [{ name: 'GST', rate: '18.00' }] }
  ];
  const result = calculatePricing({
    lines,
    discount: { id: 'd100', code: 'FREE100', kind: 'PERCENTAGE', amount: '100.00', active: true, targets: [] }
  });

  assert.equal(moneyString(result.subtotal), '998.00');
  assert.equal(moneyString(result.discountTotal), '998.00');
  assert.equal(moneyString(result.taxTotal), '0.00');
  assert.equal(moneyString(result.total), '0.00');
  assert.equal(moneyString(result.lines[0].lineTotal), '0.00');
});

test('Pricing: Discount exceeding subtotal is capped at subtotal', () => {
  const lines = [
    { key: 'srv', description: 'Starter Kit', productId: 'p1', quantity: 1, unitPrice: '250.00', taxes: [{ name: 'GST', rate: '18.00' }] }
  ];
  const result = calculatePricing({
    lines,
    discount: { id: 'd_huge', code: 'BIG1000', kind: 'FIXED', amount: '1000.00', active: true, targets: [] }
  });

  assert.equal(moneyString(result.discountTotal), '250.00');
  assert.equal(moneyString(result.taxTotal), '0.00');
  assert.equal(moneyString(result.total), '0.00');
});

test('Pricing: Discount eligibility with minimum purchase requirement', () => {
  const discount = {
    id: 'd_min',
    code: 'MIN1000',
    kind: 'FIXED',
    amount: '100.00',
    active: true,
    minimumPurchase: '1000.00',
    targets: []
  };

  const belowMinLines = [{ key: '1', productId: 'p1', quantity: 1, unitPrice: '999.99' }];
  assert.equal(
    isDiscountEligible({ discount, lines: belowMinLines, subtotal: dec('999.99'), quantity: 1 }),
    false
  );

  const exactMinLines = [{ key: '1', productId: 'p1', quantity: 1, unitPrice: '1000.00' }];
  assert.equal(
    isDiscountEligible({ discount, lines: exactMinLines, subtotal: dec('1000.00'), quantity: 1 }),
    true
  );
});

test('Pricing: Discount eligibility with minimum quantity requirement', () => {
  const discount = {
    id: 'd_qty',
    code: 'QTY5',
    kind: 'PERCENTAGE',
    amount: '10.00',
    active: true,
    minimumQuantity: 5,
    targets: []
  };

  const linesBelow = [{ key: '1', productId: 'p1', quantity: 4, unitPrice: '100.00' }];
  assert.equal(
    isDiscountEligible({ discount, lines: linesBelow, subtotal: dec('400.00'), quantity: 4 }),
    false
  );

  const linesEqual = [{ key: '1', productId: 'p1', quantity: 5, unitPrice: '100.00' }];
  assert.equal(
    isDiscountEligible({ discount, lines: linesEqual, subtotal: dec('500.00'), quantity: 5 }),
    true
  );
});

test('Pricing: Discount target matching for specific product only', () => {
  const targetedDiscount = {
    id: 'd_target',
    code: 'STORAGE_ONLY',
    kind: 'FIXED',
    amount: '50.00',
    active: true,
    targets: [{ productId: 'prod_storage' }]
  };

  const matchingLines = [
    { key: '1', productId: 'prod_compute', quantity: 1, unitPrice: '1000.00' },
    { key: '2', productId: 'prod_storage', quantity: 1, unitPrice: '200.00' }
  ];
  assert.equal(
    discountMatchesLines(targetedDiscount, matchingLines, 'plan_growth'),
    true
  );

  const nonMatchingLines = [
    { key: '1', productId: 'prod_compute', quantity: 1, unitPrice: '1000.00' }
  ];
  assert.equal(
    discountMatchesLines(targetedDiscount, nonMatchingLines, 'plan_growth'),
    false
  );
});

test('Pricing: Discount target matching for plan ID only', () => {
  const planDiscount = {
    id: 'd_plan',
    code: 'PLAN_STARTER',
    kind: 'PERCENTAGE',
    amount: '10.00',
    active: true,
    targets: [{ planId: 'plan_starter' }]
  };

  const lines = [{ key: '1', productId: 'p1', quantity: 1, unitPrice: '500.00' }];
  assert.equal(discountMatchesLines(planDiscount, lines, 'plan_starter'), true);
  assert.equal(discountMatchesLines(planDiscount, lines, 'plan_enterprise'), false);
});

test('Pricing: Tie-breaking between equal-value discounts', () => {
  const discounts = [
    { id: 'd2', code: 'ZULU', kind: 'FIXED', amount: '50.00', active: true, startsAt: '2026-02-01', targets: [] },
    { id: 'd1', code: 'ALPHA', kind: 'FIXED', amount: '50.00', active: true, startsAt: '2026-02-01', targets: [] }
  ];
  const lines = [{ key: '1', productId: 'p', quantity: 1, unitPrice: '500.00', taxes: [] }];

  const selected = selectDiscount({
    discounts,
    lines,
    subtotal: dec('500.00'),
    quantity: 1,
    planId: 'plan',
    now: new Date('2026-06-01')
  });

  // Both reduce by 50.00; both start on same date. Tied on reduction & start -> alphabetical by code: ALPHA wins!
  assert.equal(selected.discount.code, 'ALPHA');
});

test('Pricing: Earlier start date breaks tie over later start date', () => {
  const discounts = [
    { id: 'd_later', code: 'AAA', kind: 'FIXED', amount: '50.00', active: true, startsAt: '2026-03-01', targets: [] },
    { id: 'd_earlier', code: 'ZZZ', kind: 'FIXED', amount: '50.00', active: true, startsAt: '2026-01-01', targets: [] }
  ];
  const lines = [{ key: '1', productId: 'p', quantity: 1, unitPrice: '500.00', taxes: [] }];

  const selected = selectDiscount({
    discounts,
    lines,
    subtotal: dec('500.00'),
    quantity: 1,
    planId: 'plan',
    now: new Date('2026-06-01')
  });

  // Earlier start date (2026-01-01) wins over 2026-03-01 regardless of code!
  assert.equal(selected.discount.code, 'ZZZ');
});

test('Pricing: Catalog unit price resolution with variant price adjustments', () => {
  // Base price 500, variant adjustment +150
  assert.equal(moneyString(resolveCatalogUnitPrice({ basePrice: '500.00', variantAdjustment: '150.00' })), '650.00');

  // Base price 500, negative variant adjustment -50
  assert.equal(moneyString(resolveCatalogUnitPrice({ basePrice: '500.00', variantAdjustment: '-50.00' })), '450.00');

  // Add-on line uses addonPrice instead of basePrice
  assert.equal(
    moneyString(resolveCatalogUnitPrice({ basePrice: '500.00', addonPrice: '120.00', isAddon: true, variantAdjustment: '0.00' })),
    '120.00'
  );
});

test('Pricing: API output serialisation schema check', () => {
  const lines = [
    {
      key: '1',
      description: 'Core Plan',
      productId: 'p_core',
      quantity: 2,
      unitPrice: '1200.00',
      taxes: [{ name: 'GST 18%', rate: '18.00' }]
    }
  ];

  const pricing = calculatePricing({
    lines,
    discount: { id: 'd_disc', code: 'DISC200', kind: 'FIXED', amount: '200.00', active: true, targets: [] }
  });

  const apiResult = pricingForApi(pricing);

  assert.equal(typeof apiResult.subtotal, 'string');
  assert.equal(typeof apiResult.discountTotal, 'string');
  assert.equal(typeof apiResult.taxTotal, 'string');
  assert.equal(typeof apiResult.total, 'string');
  assert.equal(apiResult.subtotal, '2400.00');
  assert.equal(apiResult.discountTotal, '200.00');
  // (2400 - 200) * 0.18 = 396.00
  assert.equal(apiResult.taxTotal, '396.00');
  assert.equal(apiResult.total, '2596.00');
  assert.equal(apiResult.discount.code, 'DISC200');
  assert.equal(apiResult.lines.length, 1);
  assert.equal(apiResult.lines[0].taxes[0].amount, '396.00');
});
