/**
 * Multi-Currency Exchange and Cross-Border FX Invoicing Dataset.
 *
 * Models foreign exchange conversion rates, currency decimal precisions,
 * and zero-leakage integer conversions against base currency INR.
 */

export const CURRENCY_CONFIG = Object.freeze({
  INR: { code: 'INR', symbol: '₹', decimalPlaces: 2, defaultRateAgainstInr: '1.00' },
  USD: { code: 'USD', symbol: '$', decimalPlaces: 2, defaultRateAgainstInr: '84.50' },
  EUR: { code: 'EUR', symbol: '€', decimalPlaces: 2, defaultRateAgainstInr: '91.20' },
  GBP: { code: 'GBP', symbol: '£', decimalPlaces: 2, defaultRateAgainstInr: '108.75' },
  SGD: { code: 'SGD', symbol: 'S$', decimalPlaces: 2, defaultRateAgainstInr: '64.10' },
  AED: { code: 'AED', symbol: 'AED', decimalPlaces: 2, defaultRateAgainstInr: '23.01' },
  JPY: { code: 'JPY', symbol: '¥', decimalPlaces: 0, defaultRateAgainstInr: '0.56' }
});

/**
 * Builds 50 deterministic cross-border forex billing fixtures.
 */
export function buildCurrencyExchangeScenarios() {
  const currencies = ['USD', 'EUR', 'GBP', 'SGD', 'AED'];
  const baseInrAmounts = [
    '2499.00', '4999.00', '9999.00', '19999.00', '49999.00',
    '99999.00', '149999.00', '250000.00', '500000.00', '1000000.00'
  ];

  const scenarios = [];

  for (let i = 1; i <= 50; i += 1) {
    const foreignCurrency = currencies[(i - 1) % currencies.length];
    const cfg = CURRENCY_CONFIG[foreignCurrency];
    const rateAgainstInr = parseFloat(cfg.defaultRateAgainstInr);
    const inrAmount = baseInrAmounts[(i - 1) % baseInrAmounts.length];
    const inrCents = Math.round(parseFloat(inrAmount) * 100);

    // Foreign amount = INR amount / rateAgainstInr
    const foreignUnitValue = inrCents / (rateAgainstInr * 100);
    const foreignCents = Math.round(foreignUnitValue * 100);
    const foreignFormatted = (foreignCents / 100).toFixed(2);

    // Recomputed INR from foreign amount at specified rate to test round-trip variance
    const roundTripInrCents = Math.round(foreignCents * rateAgainstInr);
    const roundTripInr = (roundTripInrCents / 100).toFixed(2);

    scenarios.push({
      scenarioId: `FX-SCN-${String(i).padStart(4, '0')}`,
      invoiceId: `inv_fx_${String(i).padStart(4, '0')}`,
      baseCurrency: 'INR',
      baseAmountInr: inrAmount,
      targetCurrency: foreignCurrency,
      exchangeRate: cfg.defaultRateAgainstInr,
      targetAmountFormatted: foreignFormatted,
      roundTripInrFormatted: roundTripInr,
      effectiveDate: '2026-10-31',
      rateSource: 'RBI_REFERENCE_RATE',
      isExportLut: true
    });
  }

  return scenarios;
}

export const CURRENCY_EXCHANGE_SCENARIOS = Object.freeze(buildCurrencyExchangeScenarios());
