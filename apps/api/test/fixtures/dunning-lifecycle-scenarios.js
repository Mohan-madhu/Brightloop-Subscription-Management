/**
 * Dunning Lifecycle and Overdue Debt Recovery Dataset.
 *
 * Models automated retry schedules, overdue aging intervals, customer notification tiers,
 * and service suspension thresholds for Brightloop subscription management.
 */

export const DUNNING_TIERS = Object.freeze({
  ON_TIME: { minDays: -999, maxDays: 0, action: 'NONE', emailTemplate: null },
  GRACE: { minDays: 1, maxDays: 3, action: 'SOFT_REMINDER', emailTemplate: 'invoice_reminder_soft' },
  WARNING: { minDays: 4, maxDays: 7, action: 'URGENT_NOTICE', emailTemplate: 'invoice_reminder_urgent' },
  CRITICAL: { minDays: 8, maxDays: 14, action: 'SUSPENSION_WARNING', emailTemplate: 'service_suspension_warning' },
  SUSPENDED: { minDays: 15, maxDays: 30, action: 'SUSPEND_SERVICE', emailTemplate: 'service_suspended_notice' },
  TERMINATED: { minDays: 31, maxDays: 9999, action: 'TERMINATE_WRITE_OFF', emailTemplate: 'account_terminated' }
});

/**
 * Builds 50 deterministic dunning scenarios across various overdue ages.
 */
export function buildDunningScenarios() {
  const scenarios = [];

  const daysOverdueList = [
    -5, 0, 1, 2, 3, 4, 5, 7, 8, 10,
    14, 15, 18, 21, 28, 30, 31, 45, 60, 90
  ];

  for (let i = 1; i <= 50; i += 1) {
    const daysOverdue = daysOverdueList[(i - 1) % daysOverdueList.length];
    const invoiceId = `inv_dun_${String(i).padStart(4, '0')}`;
    const customerId = `cust_dun_${String((i % 20) + 1).padStart(4, '0')}`;
    const amountDue = ((i * 150) + 500).toFixed(2);

    let tierKey = 'ON_TIME';
    if (daysOverdue > 30) tierKey = 'TERMINATED';
    else if (daysOverdue >= 15) tierKey = 'SUSPENDED';
    else if (daysOverdue >= 8) tierKey = 'CRITICAL';
    else if (daysOverdue >= 4) tierKey = 'WARNING';
    else if (daysOverdue >= 1) tierKey = 'GRACE';

    const tier = DUNNING_TIERS[tierKey];

    scenarios.push({
      scenarioId: `DUN-SCN-${String(i).padStart(4, '0')}`,
      invoiceId,
      customerId,
      amountDue,
      daysOverdue,
      tier: tierKey,
      expectedAction: tier.action,
      expectedEmailTemplate: tier.emailTemplate,
      shouldSuspendSubscription: daysOverdue >= 15,
      shouldTerminateSubscription: daysOverdue > 30
    });
  }

  return scenarios;
}

export const DUNNING_SCENARIOS = Object.freeze(buildDunningScenarios());
