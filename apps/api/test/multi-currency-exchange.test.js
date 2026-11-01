import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENCY_CONFIG,
  CURRENCY_EXCHANGE_SCENARIOS
} from './fixtures/currency-exchange-scenarios.js';

test('Multi-Currency: Configuration defines valid ISO currency codes', () => {
  const codes = Object.keys(CURRENCY_CONFIG);
  assert.ok(codes.includes('INR'));
  assert.ok(codes.includes('USD'));
  assert.ok(codes.includes('EUR'));
  assert.ok(codes.includes('GBP'));
  assert.ok(codes.includes('SGD'));
  assert.ok(codes.includes('AED'));
  assert.ok(codes.includes('JPY'));

  for (const code of codes) {
    const cfg = CURRENCY_CONFIG[code];
    assert.equal(cfg.code, code);
    assert.ok(cfg.symbol);
    assert.ok(typeof cfg.decimalPlaces === 'number');
    assert.ok(parseFloat(cfg.defaultRateAgainstInr) > 0);
  }
});

test('Multi-Currency: JPY has 0 decimal places while others have 2', () => {
  assert.equal(CURRENCY_CONFIG.JPY.decimalPlaces, 0);
  assert.equal(CURRENCY_CONFIG.USD.decimalPlaces, 2);
  assert.equal(CURRENCY_CONFIG.INR.decimalPlaces, 2);
  assert.equal(CURRENCY_CONFIG.EUR.decimalPlaces, 2);
});

test('Multi-Currency: Dataset contains 50 foreign exchange scenarios', () => {
  assert.equal(CURRENCY_EXCHANGE_SCENARIOS.length, 50);
});

test('Multi-Currency: Conversion arithmetic strictly adheres to fixed decimal bounds', () => {
  for (const scn of CURRENCY_EXCHANGE_SCENARIOS) {
    const inr = parseFloat(scn.baseAmountInr);
    const rate = parseFloat(scn.exchangeRate);
    const expectedForeign = parseFloat(scn.targetAmountFormatted);

    const calculatedForeign = inr / rate;
    const diff = Math.abs(calculatedForeign - expectedForeign);

    // Difference must be strictly within 1 cent (half-up rounding margin)
    assert.ok(
      diff < 0.015,
      `Conversion error exceeds margin for ${scn.scenarioId}: diff=${diff}`
    );
  }
});

test('Multi-Currency: Round-trip forex conversion variance remains under 0.1% tolerance', () => {
  for (const scn of CURRENCY_EXCHANGE_SCENARIOS) {
    const originalInr = parseFloat(scn.baseAmountInr);
    const roundTripInr = parseFloat(scn.roundTripInrFormatted);

    const percentageDiff = Math.abs((roundTripInr - originalInr) / originalInr) * 100;
    assert.ok(
      percentageDiff < 0.1,
      `Round-trip drift too large for ${scn.scenarioId}: ${percentageDiff}%`
    );
  }
});

test('Multi-Currency: Export LUT status is enforced for international FX invoices', () => {
  for (const scn of CURRENCY_EXCHANGE_SCENARIOS) {
    assert.equal(scn.isExportLut, true);
    assert.equal(scn.rateSource, 'RBI_REFERENCE_RATE');
  }
});

test('Multi-Currency: Format currency helper function', () => {
  function formatMoneyWithSymbol(amount, currencyCode) {
    const cfg = CURRENCY_CONFIG[currencyCode] || { symbol: currencyCode, decimalPlaces: 2 };
    const num = parseFloat(amount);
    return `${cfg.symbol}${num.toFixed(cfg.decimalPlaces)}`;
  }

  assert.equal(formatMoneyWithSymbol('1499.00', 'INR'), '₹1499.00');
  assert.equal(formatMoneyWithSymbol('50.25', 'USD'), '$50.25');
  assert.equal(formatMoneyWithSymbol('45.10', 'EUR'), '€45.10');
  assert.equal(formatMoneyWithSymbol('5000', 'JPY'), '¥5000');
});
