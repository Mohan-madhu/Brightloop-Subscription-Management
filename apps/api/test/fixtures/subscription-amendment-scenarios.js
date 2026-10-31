/**
 * Subscription Contract Amendments and Lifecycle Revision Scenarios.
 *
 * Models enterprise contract changes:
 * 1. Term extension amendments (e.g., 12-month commitment renewed for another 12 months)
 * 2. Price lock guarantees (grandfathered pricing on legacy tiers)
 * 3. Service pause schedules with frozen billing periods
 * 4. Contract versioning with immutable audit trails
 */

export const AMENDMENT_TYPES = Object.freeze({
  TERM_EXTENSION: 'TERM_EXTENSION',
  PRICE_LOCK: 'PRICE_LOCK',
  SCHEDULED_PAUSE: 'SCHEDULED_PAUSE',
  SLA_PENALTY_CREDIT: 'SLA_PENALTY_CREDIT',
  SEAT_EXPANSION: 'SEAT_EXPANSION'
});

/**
 * Builds 50 deterministic subscription contract amendment scenarios.
 */
export function buildSubscriptionAmendmentScenarios() {
  const scenarios = [];
  const types = Object.values(AMENDMENT_TYPES);

  for (let i = 1; i <= 50; i += 1) {
    const amendmentId = `amend_${String(i).padStart(4, '0')}`;
    const subscriptionId = `sub_contract_${String((i % 20) + 1).padStart(4, '0')}`;
    const amendmentType = types[(i - 1) % types.length];
    const contractVersion = Math.floor(i / 10) + 1;

    let payload = {};
    if (amendmentType === 'TERM_EXTENSION') {
      payload = {
        extendedMonths: 12,
        newExpiryDate: '2027-10-31',
        renewalDiscountPercentage: '10.00'
      };
    } else if (amendmentType === 'PRICE_LOCK') {
      payload = {
        grandfatheredMonthlyRate: '1999.00',
        guaranteedUntil: '2028-12-31'
      };
    } else if (amendmentType === 'SCHEDULED_PAUSE') {
      payload = {
        pauseStartDate: '2026-11-15',
        resumeStartDate: '2026-12-15',
        pauseDurationDays: 30
      };
    } else if (amendmentType === 'SLA_PENALTY_CREDIT') {
      payload = {
        incidentId: `inc_${1000 + i}`,
        slaBreachUptimePercentage: '99.45',
        contractGuaranteedUptime: '99.90',
        serviceCreditPercentage: '15.00',
        creditAmountFormatted: '375.00'
      };
    } else {
      payload = {
        additionalSeats: 10,
        seatUnitPrice: '150.00',
        effectiveFrom: '2026-11-01'
      };
    }

    scenarios.push({
      scenarioId: `AMD-SCN-${String(i).padStart(4, '0')}`,
      amendmentId,
      subscriptionId,
      contractVersion,
      amendmentType,
      status: 'APPROVED',
      approvedBy: 'usr_legal_admin_01',
      amendmentDate: '2026-10-31',
      details: payload
    });
  }

  return scenarios;
}

export const SUBSCRIPTION_AMENDMENT_SCENARIOS = Object.freeze(buildSubscriptionAmendmentScenarios());
