/**
 * Metered & Consumption-Based Billing Scenarios for Brightloop Subscriptions.
 *
 * Implements usage rating models:
 * 1. Tiered Graduated Pricing (brackets where each tier price applies to usage within that bracket)
 * 2. Tiered Volume Pricing (price determined by final bracket applies to all units)
 * 3. Overage Pricing (base allowance included, overage charged at unit rate)
 * 4. Aggregation modes: SUM (total events), MAX (peak usage), LAST (ending balance)
 */

export const USAGE_TIERS_CATALOG = Object.freeze({
  API_CALLS_GRADUATED: {
    metric: 'api_calls',
    model: 'GRADUATED',
    tiers: [
      { upTo: 10000, unitPrice: '0.00' },    // First 10,000 free
      { upTo: 50000, unitPrice: '0.05' },    // Next 40,000 at 0.05 INR
      { upTo: 200000, unitPrice: '0.03' },   // Next 150,000 at 0.03 INR
      { upTo: null, unitPrice: '0.01' }       // Beyond 200,000 at 0.01 INR
    ]
  },
  STORAGE_VOLUME: {
    metric: 'storage_gb_hours',
    model: 'VOLUME',
    tiers: [
      { upTo: 100, unitPrice: '2.00' },      // 1-100 GB: 2.00 INR/GB
      { upTo: 500, unitPrice: '1.50' },      // 101-500 GB: 1.50 INR/GB for all
      { upTo: 2000, unitPrice: '1.00' },     // 501-2000 GB: 1.00 INR/GB for all
      { upTo: null, unitPrice: '0.75' }       // > 2000 GB: 0.75 INR/GB for all
    ]
  },
  COMPUTE_OVERAGE: {
    metric: 'vcpu_hours',
    model: 'OVERAGE',
    baseAllowance: 100,
    unitPriceOverage: '5.00'
  }
});

/**
 * Computes price under graduated tier rules.
 * @param {number} units
 * @param {Array<{ upTo: number|null, unitPrice: string }>} tiers
 * @returns {{ totalCents: number, formatted: string, breakdown: Array<object> }}
 */
export function calculateGraduatedPrice(units, tiers) {
  if (units <= 0) return { totalCents: 0, formatted: '0.00', breakdown: [] };

  let remaining = units;
  let prevUpTo = 0;
  let totalCents = 0;
  const breakdown = [];

  for (const tier of tiers) {
    if (remaining <= 0) break;

    const tierLimit = tier.upTo ? (tier.upTo - prevUpTo) : Infinity;
    const unitsInTier = Math.min(remaining, tierLimit);
    const unitPriceCents = Math.round(parseFloat(tier.unitPrice) * 100);
    const tierCostCents = Math.round(unitsInTier * unitPriceCents);

    breakdown.push({
      units: unitsInTier,
      unitPrice: tier.unitPrice,
      costCents: tierCostCents,
      costFormatted: (tierCostCents / 100).toFixed(2)
    });

    totalCents += tierCostCents;
    remaining -= unitsInTier;
    if (tier.upTo) prevUpTo = tier.upTo;
  }

  return {
    totalCents,
    formatted: (totalCents / 100).toFixed(2),
    breakdown
  };
}

/**
 * Computes price under volume tier rules.
 * @param {number} units
 * @param {Array<{ upTo: number|null, unitPrice: string }>} tiers
 */
export function calculateVolumePrice(units, tiers) {
  if (units <= 0) return { totalCents: 0, formatted: '0.00', effectiveRate: '0.00' };

  let matchedRate = tiers[tiers.length - 1].unitPrice;
  for (const tier of tiers) {
    if (tier.upTo === null || units <= tier.upTo) {
      matchedRate = tier.unitPrice;
      break;
    }
  }

  const rateCents = Math.round(parseFloat(matchedRate) * 100);
  const totalCents = Math.round(units * rateCents);

  return {
    totalCents,
    formatted: (totalCents / 100).toFixed(2),
    effectiveRate: matchedRate
  };
}

/**
 * Computes overage cost given base allowance.
 * @param {number} units
 * @param {number} allowance
 * @param {string} unitRate
 */
export function calculateOveragePrice(units, allowance, unitRate) {
  const overageUnits = Math.max(0, units - allowance);
  const rateCents = Math.round(parseFloat(unitRate) * 100);
  const totalCents = Math.round(overageUnits * rateCents);

  return {
    overageUnits,
    totalCents,
    formatted: (totalCents / 100).toFixed(2)
  };
}

/**
 * Builds 50 deterministic metered billing test scenarios.
 */
export function buildMeteredUsageScenarios() {
  const scenarios = [];

  const usageUnits = [
    5000, 10000, 15000, 25000, 50000,
    75000, 100000, 150000, 250000, 500000
  ];

  for (let i = 1; i <= 50; i += 1) {
    const units = usageUnits[(i - 1) % usageUnits.length];
    const customerId = `cust_metered_${String((i % 15) + 1).padStart(4, '0')}`;
    const subscriptionId = `sub_metered_${String(i).padStart(4, '0')}`;

    const graduated = calculateGraduatedPrice(units, USAGE_TIERS_CATALOG.API_CALLS_GRADUATED.tiers);
    const volume = calculateVolumePrice(Math.round(units / 100), USAGE_TIERS_CATALOG.STORAGE_VOLUME.tiers);
    const overage = calculateOveragePrice(Math.round(units / 50), 100, '5.00');

    scenarios.push({
      scenarioId: `MET-SCN-${String(i).padStart(4, '0')}`,
      customerId,
      subscriptionId,
      units,
      graduatedResult: {
        totalCost: graduated.formatted,
        breakdownCount: graduated.breakdown.length
      },
      volumeResult: {
        storageGb: Math.round(units / 100),
        effectiveRate: volume.effectiveRate,
        totalCost: volume.formatted
      },
      overageResult: {
        vcpuHours: Math.round(units / 50),
        overageUnits: overage.overageUnits,
        totalCost: overage.formatted
      },
      billingPeriod: '2026-10-01 to 2026-10-31'
    });
  }

  return scenarios;
}

export const METERED_USAGE_SCENARIOS = Object.freeze(buildMeteredUsageScenarios());
