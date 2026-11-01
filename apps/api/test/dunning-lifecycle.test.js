import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DUNNING_TIERS,
  DUNNING_SCENARIOS
} from './fixtures/dunning-lifecycle-scenarios.js';

/**
 * Resolves appropriate dunning tier for an invoice based on overdue days.
 * @param {number} daysOverdue
 * @returns {string} Tier key
 */
function resolveDunningTier(daysOverdue) {
  if (daysOverdue > 30) return 'TERMINATED';
  if (daysOverdue >= 15) return 'SUSPENDED';
  if (daysOverdue >= 8) return 'CRITICAL';
  if (daysOverdue >= 4) return 'WARNING';
  if (daysOverdue >= 1) return 'GRACE';
  return 'ON_TIME';
}

test('Dunning Lifecycle: Dataset contains 50 test scenarios', () => {
  assert.equal(DUNNING_SCENARIOS.length, 50);
});

test('Dunning Lifecycle: Accurate tier resolution across all 50 scenarios', () => {
  for (const scn of DUNNING_SCENARIOS) {
    const resolved = resolveDunningTier(scn.daysOverdue);
    assert.equal(resolved, scn.tier, `Tier mismatch in ${scn.scenarioId} with daysOverdue=${scn.daysOverdue}`);

    const tierDef = DUNNING_TIERS[resolved];
    assert.equal(tierDef.action, scn.expectedAction);
    assert.equal(tierDef.emailTemplate, scn.expectedEmailTemplate);
  }
});

test('Dunning Lifecycle: Suspension rules trigger at 15+ days overdue', () => {
  for (const scn of DUNNING_SCENARIOS) {
    const isSuspensionEligible = scn.daysOverdue >= 15;
    assert.equal(isSuspensionEligible, scn.shouldSuspendSubscription);
  }
});

test('Dunning Lifecycle: Termination rules trigger at 31+ days overdue', () => {
  for (const scn of DUNNING_SCENARIOS) {
    const isTerminationEligible = scn.daysOverdue > 30;
    assert.equal(isTerminationEligible, scn.shouldTerminateSubscription);
  }
});

test('Dunning Lifecycle: Outbox reminder deduplication prevents spam within 24 hours', () => {
  const sentOutboxLogs = new Map();

  function queueDunningNotice(invoiceId, tier, currentTimeMs) {
    const logKey = `${invoiceId}::${tier}`;
    const lastSentMs = sentOutboxLogs.get(logKey);

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (lastSentMs && (currentTimeMs - lastSentMs) < ONE_DAY_MS) {
      return { queued: false, reason: 'RATE_LIMITED_24H' };
    }

    sentOutboxLogs.set(logKey, currentTimeMs);
    return { queued: true, outboxId: `outbox_${invoiceId}_${tier}` };
  }

  const baseTime = Date.now();
  const invoiceId = 'inv_test_dun_01';

  // First send succeeds
  const r1 = queueDunningNotice(invoiceId, 'GRACE', baseTime);
  assert.equal(r1.queued, true);

  // Immediate retry within 1 hour is rejected
  const r2 = queueDunningNotice(invoiceId, 'GRACE', baseTime + (3600 * 1000));
  assert.equal(r2.queued, false);
  assert.equal(r2.reason, 'RATE_LIMITED_24H');

  // Next tier is allowed immediately
  const r3 = queueDunningNotice(invoiceId, 'WARNING', baseTime + (3600 * 1000));
  assert.equal(r3.queued, true);

  // Send after 25 hours is allowed
  const r4 = queueDunningNotice(invoiceId, 'GRACE', baseTime + (25 * 3600 * 1000));
  assert.equal(r4.queued, true);
});

test('Dunning Lifecycle: On-time invoices produce no email queue actions', () => {
  const onTimeScenarios = DUNNING_SCENARIOS.filter((s) => s.daysOverdue <= 0);
  assert.ok(onTimeScenarios.length > 0);

  for (const scn of onTimeScenarios) {
    assert.equal(scn.expectedAction, 'NONE');
    assert.equal(scn.expectedEmailTemplate, null);
  }
});
