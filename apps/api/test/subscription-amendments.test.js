import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AMENDMENT_TYPES,
  SUBSCRIPTION_AMENDMENT_SCENARIOS
} from './fixtures/subscription-amendment-scenarios.js';

test('Subscription Amendments: Dataset contains 50 contract revision scenarios', () => {
  assert.equal(SUBSCRIPTION_AMENDMENT_SCENARIOS.length, 50);
});

test('Subscription Amendments: Valid amendment types only', () => {
  const recognizedTypes = new Set(Object.values(AMENDMENT_TYPES));

  for (const amd of SUBSCRIPTION_AMENDMENT_SCENARIOS) {
    assert.ok(
      recognizedTypes.has(amd.amendmentType),
      `Unknown amendment type: ${amd.amendmentType} in ${amd.scenarioId}`
    );
    assert.ok(amd.contractVersion >= 1);
    assert.equal(amd.status, 'APPROVED');
    assert.ok(amd.approvedBy);
  }
});

test('Subscription Amendments: SLA penalty credits calculate within contract terms', () => {
  const slaAmendments = SUBSCRIPTION_AMENDMENT_SCENARIOS.filter((s) => s.amendmentType === 'SLA_PENALTY_CREDIT');
  assert.ok(slaAmendments.length > 0);

  for (const amd of slaAmendments) {
    const breach = parseFloat(amd.details.slaBreachUptimePercentage);
    const guaranteed = parseFloat(amd.details.contractGuaranteedUptime);
    assert.ok(breach < guaranteed, 'Breach uptime must be less than guaranteed uptime');
    assert.ok(parseFloat(amd.details.serviceCreditPercentage) > 0);
    assert.ok(parseFloat(amd.details.creditAmountFormatted) > 0);
  }
});

test('Subscription Amendments: Scheduled pause dates maintain logical ordering', () => {
  const pauseAmendments = SUBSCRIPTION_AMENDMENT_SCENARIOS.filter((s) => s.amendmentType === 'SCHEDULED_PAUSE');
  assert.ok(pauseAmendments.length > 0);

  for (const amd of pauseAmendments) {
    const pauseStart = new Date(amd.details.pauseStartDate).getTime();
    const resumeStart = new Date(amd.details.resumeStartDate).getTime();

    assert.ok(
      resumeStart > pauseStart,
      `Resume date ${amd.details.resumeStartDate} must be after pause date ${amd.details.pauseStartDate}`
    );
    assert.ok(amd.details.pauseDurationDays > 0);
  }
});
