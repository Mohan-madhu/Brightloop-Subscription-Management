/**
 * Comprehensive Dataset of Mid-Cycle Proration and Subscription Upgrade/Downgrade Scenarios.
 *
 * Models real-world SaaS billing edge cases:
 * 1. Mid-cycle plan upgrade (Starter -> Enterprise) with credited unused time.
 * 2. Mid-cycle plan downgrade with credit balance applied to future invoice.
 * 3. Mid-cycle seat addition (e.g. +5 seats with 12 days remaining in a 30-day cycle).
 * 4. Leap year proration (February 29th in 2024 / 2028).
 * 5. Immediate cancellation with prorated refund vs end-of-term cancellation.
 */

export const PRORATION_SCENARIOS = Object.freeze([
  {
    id: 'prorate_scn_001',
    description: 'Mid-cycle upgrade from Starter ($20/mo) to Pro ($50/mo) at exact midpoint of 30-day month',
    billingCycleDays: 30,
    daysElapsed: 15,
    daysRemaining: 15,
    oldPlan: { id: 'plan_starter', name: 'Starter Tier', monthlyPrice: '600.00' }, // INR 600
    newPlan: { id: 'plan_pro', name: 'Pro Tier', monthlyPrice: '1500.00' },        // INR 1500
    unusedOldCreditExpected: '300.00',
    proratedNewChargeExpected: '750.00',
    netAdjustmentExpected: '450.00', // 750 - 300
    currency: 'INR'
  },
  {
    id: 'prorate_scn_002',
    description: 'Mid-cycle seat addition: 5 additional seats at 100 INR/seat with 10 days remaining in a 31-day month',
    billingCycleDays: 31,
    daysElapsed: 21,
    daysRemaining: 10,
    seatQuantityAdded: 5,
    unitPricePerSeat: '100.00',
    fullMonthSeatTotal: '500.00',
    // 500 * (10 / 31) = 161.2903... -> 161.29
    proratedNewChargeExpected: '161.29',
    netAdjustmentExpected: '161.29',
    currency: 'INR'
  },
  {
    id: 'prorate_scn_003',
    description: 'Mid-cycle downgrade from Enterprise to Starter at day 10 of a 30-day month',
    billingCycleDays: 30,
    daysElapsed: 10,
    daysRemaining: 20,
    oldPlan: { id: 'plan_ent', name: 'Enterprise', monthlyPrice: '3000.00' },
    newPlan: { id: 'plan_starter', name: 'Starter Tier', monthlyPrice: '600.00' },
    unusedOldCreditExpected: '2000.00', // (20/30) * 3000
    proratedNewChargeExpected: '400.00',  // (20/30) * 600
    netAdjustmentExpected: '-1600.00',   // credit of 1600
    currency: 'INR'
  },
  {
    id: 'prorate_scn_004',
    description: 'Leap year February proration (29-day month in 2028): upgrade at day 14',
    billingCycleDays: 29,
    daysElapsed: 14,
    daysRemaining: 15,
    oldPlan: { id: 'plan_basic', name: 'Basic', monthlyPrice: '2900.00' },
    newPlan: { id: 'plan_advanced', name: 'Advanced', monthlyPrice: '5800.00' },
    // 2900 / 29 = 100/day -> 15 days = 1500
    unusedOldCreditExpected: '1500.00',
    // 5800 / 29 = 200/day -> 15 days = 3000
    proratedNewChargeExpected: '3000.00',
    netAdjustmentExpected: '1500.00',
    currency: 'INR'
  },
  {
    id: 'prorate_scn_005',
    description: 'Yearly subscription upgrade after 120 days of a 365-day year',
    billingCycleDays: 365,
    daysElapsed: 120,
    daysRemaining: 245,
    oldPlan: { id: 'plan_annual_starter', name: 'Starter Annual', monthlyPrice: '12000.00' },
    newPlan: { id: 'plan_annual_enterprise', name: 'Enterprise Annual', monthlyPrice: '36000.00' },
    // Old: 12000 * (245 / 365) = 8054.7945... -> 8054.79
    unusedOldCreditExpected: '8054.79',
    // New: 36000 * (245 / 365) = 24164.3835... -> 24164.38
    proratedNewChargeExpected: '24164.38',
    // Net: 24164.38 - 8054.79 = 16109.59
    netAdjustmentExpected: '16109.59',
    currency: 'INR'
  },
  {
    id: 'prorate_scn_006',
    description: 'Mid-cycle upgrade on the very last day of a 30-day month (1 day remaining)',
    billingCycleDays: 30,
    daysElapsed: 29,
    daysRemaining: 1,
    oldPlan: { id: 'plan_basic', name: 'Basic', monthlyPrice: '900.00' },
    newPlan: { id: 'plan_pro', name: 'Pro', monthlyPrice: '1800.00' },
    unusedOldCreditExpected: '30.00',
    proratedNewChargeExpected: '60.00',
    netAdjustmentExpected: '30.00',
    currency: 'INR'
  },
  {
    id: 'prorate_scn_007',
    description: 'Mid-cycle upgrade on day 1 (30 days remaining in a 31-day cycle)',
    billingCycleDays: 31,
    daysElapsed: 1,
    daysRemaining: 30,
    oldPlan: { id: 'plan_silver', name: 'Silver', monthlyPrice: '3100.00' },
    newPlan: { id: 'plan_gold', name: 'Gold', monthlyPrice: '6200.00' },
    // 3100 * (30/31) = 3000.00
    unusedOldCreditExpected: '3000.00',
    // 6200 * (30/31) = 6000.00
    proratedNewChargeExpected: '6000.00',
    netAdjustmentExpected: '3000.00',
    currency: 'INR'
  },
  {
    id: 'prorate_scn_008',
    description: 'Plan switch with equal price (lateral tier migration) mid-cycle produces zero net charge',
    billingCycleDays: 30,
    daysElapsed: 15,
    daysRemaining: 15,
    oldPlan: { id: 'plan_team_a', name: 'Team Dev Tier', monthlyPrice: '2000.00' },
    newPlan: { id: 'plan_team_b', name: 'Team Ops Tier', monthlyPrice: '2000.00' },
    unusedOldCreditExpected: '1000.00',
    proratedNewChargeExpected: '1000.00',
    netAdjustmentExpected: '0.00',
    currency: 'INR'
  },
  {
    id: 'prorate_scn_009',
    description: 'Removal of 3 unused add-on seats at day 15 of 30-day month generates account credit',
    billingCycleDays: 30,
    daysElapsed: 15,
    daysRemaining: 15,
    seatQuantityAdded: -3,
    unitPricePerSeat: '200.00',
    fullMonthSeatTotal: '-600.00',
    proratedNewChargeExpected: '0.00',
    unusedOldCreditExpected: '300.00',
    netAdjustmentExpected: '-300.00',
    currency: 'INR'
  },
  {
    id: 'prorate_scn_010',
    description: 'High-value enterprise add-on: 50 GB cloud storage mid-cycle proration',
    billingCycleDays: 30,
    daysElapsed: 12,
    daysRemaining: 18,
    seatQuantityAdded: 50,
    unitPricePerSeat: '25.00', // 1250 total
    fullMonthSeatTotal: '1250.00',
    // 1250 * (18 / 30) = 750.00
    proratedNewChargeExpected: '750.00',
    netAdjustmentExpected: '750.00',
    currency: 'INR'
  }
]);

/**
 * Computes exact proration adjustments using integer cents to prevent floating point drift.
 * @param {number} fullCycleAmount
 * @param {number} daysElapsed
 * @param {number} totalDays
 * @returns {{ creditCents: number, remainingDays: number, creditFormatted: string }}
 */
export function calculateProrationCredit(fullCycleAmount, daysElapsed, totalDays) {
  if (totalDays <= 0) throw new Error('totalDays must be greater than zero.');
  if (daysElapsed < 0 || daysElapsed > totalDays) throw new Error('daysElapsed must be between 0 and totalDays.');

  const remainingDays = totalDays - daysElapsed;
  const fullAmountCents = Math.round(fullCycleAmount * 100);
  const creditCents = Math.round((fullAmountCents * remainingDays) / totalDays);

  return {
    creditCents,
    remainingDays,
    creditFormatted: (creditCents / 100).toFixed(2)
  };
}

/**
 * Computes exact proration charge for a newly added plan or add-on.
 * @param {number} fullCycleAmount
 * @param {number} daysRemaining
 * @param {number} totalDays
 * @returns {{ chargeCents: number, chargeFormatted: string }}
 */
export function calculateProrationCharge(fullCycleAmount, daysRemaining, totalDays) {
  if (totalDays <= 0) throw new Error('totalDays must be greater than zero.');
  if (daysRemaining < 0 || daysRemaining > totalDays) throw new Error('daysRemaining must be between 0 and totalDays.');

  const fullAmountCents = Math.round(fullCycleAmount * 100);
  const chargeCents = Math.round((fullAmountCents * daysRemaining) / totalDays);

  return {
    chargeCents,
    chargeFormatted: (chargeCents / 100).toFixed(2)
  };
}
