import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRORATION_SCENARIOS,
  calculateProrationCredit,
  calculateProrationCharge
} from './fixtures/proration-edge-cases.js';
import { moneyString } from '../src/services/money.js';

test('Proration: Dataset contains 10 comprehensive edge cases', () => {
  assert.equal(PRORATION_SCENARIOS.length, 10);
});

test('Proration: Standard plan upgrade mid-month calculation', () => {
  const scn = PRORATION_SCENARIOS[0]; // Starter to Pro at day 15 of 30
  const credit = calculateProrationCredit(parseFloat(scn.oldPlan.monthlyPrice), scn.daysElapsed, scn.billingCycleDays);
  const charge = calculateProrationCharge(parseFloat(scn.newPlan.monthlyPrice), scn.daysRemaining, scn.billingCycleDays);

  assert.equal(credit.creditFormatted, scn.unusedOldCreditExpected);
  assert.equal(charge.chargeFormatted, scn.proratedNewChargeExpected);

  const netCents = charge.chargeCents - credit.creditCents;
  const netFormatted = (netCents / 100).toFixed(2);
  assert.equal(netFormatted, scn.netAdjustmentExpected);
});

test('Proration: Mid-cycle seat addition calculation with fractional division', () => {
  const scn = PRORATION_SCENARIOS[1]; // 5 seats with 10 days remaining in 31 days
  const charge = calculateProrationCharge(parseFloat(scn.fullMonthSeatTotal), scn.daysRemaining, scn.billingCycleDays);

  assert.equal(charge.chargeFormatted, scn.proratedNewChargeExpected);
});

test('Proration: Mid-cycle downgrade generates negative net adjustment (account credit)', () => {
  const scn = PRORATION_SCENARIOS[2];
  const credit = calculateProrationCredit(parseFloat(scn.oldPlan.monthlyPrice), scn.daysElapsed, scn.billingCycleDays);
  const charge = calculateProrationCharge(parseFloat(scn.newPlan.monthlyPrice), scn.daysRemaining, scn.billingCycleDays);

  assert.equal(credit.creditFormatted, scn.unusedOldCreditExpected);
  assert.equal(charge.chargeFormatted, scn.proratedNewChargeExpected);

  const netCents = charge.chargeCents - credit.creditCents;
  const netFormatted = (netCents / 100).toFixed(2);
  assert.equal(netFormatted, scn.netAdjustmentExpected);
});

test('Proration: Leap year February 29-day cycle handles odd day divisions', () => {
  const scn = PRORATION_SCENARIOS[3];
  const credit = calculateProrationCredit(parseFloat(scn.oldPlan.monthlyPrice), scn.daysElapsed, scn.billingCycleDays);
  const charge = calculateProrationCharge(parseFloat(scn.newPlan.monthlyPrice), scn.daysRemaining, scn.billingCycleDays);

  assert.equal(credit.creditFormatted, scn.unusedOldCreditExpected);
  assert.equal(charge.chargeFormatted, scn.proratedNewChargeExpected);

  const netAdjustment = moneyString(parseFloat(charge.chargeFormatted) - parseFloat(credit.creditFormatted));
  assert.equal(netAdjustment, scn.netAdjustmentExpected);
});

test('Proration: Annual plan 365-day upgrade accuracy', () => {
  const scn = PRORATION_SCENARIOS[4];
  const credit = calculateProrationCredit(parseFloat(scn.oldPlan.monthlyPrice), scn.daysElapsed, scn.billingCycleDays);
  const charge = calculateProrationCharge(parseFloat(scn.newPlan.monthlyPrice), scn.daysRemaining, scn.billingCycleDays);

  assert.equal(credit.creditFormatted, scn.unusedOldCreditExpected);
  assert.equal(charge.chargeFormatted, scn.proratedNewChargeExpected);

  const netAdjustment = moneyString(parseFloat(charge.chargeFormatted) - parseFloat(credit.creditFormatted));
  assert.equal(netAdjustment, scn.netAdjustmentExpected);
});

test('Proration: Boundary conditions - day 1 and day 29 in 30/31 day months', () => {
  const day29 = PRORATION_SCENARIOS[5];
  const credit29 = calculateProrationCredit(parseFloat(day29.oldPlan.monthlyPrice), day29.daysElapsed, day29.billingCycleDays);
  const charge29 = calculateProrationCharge(parseFloat(day29.newPlan.monthlyPrice), day29.daysRemaining, day29.billingCycleDays);
  assert.equal(credit29.creditFormatted, day29.unusedOldCreditExpected);
  assert.equal(charge29.chargeFormatted, day29.proratedNewChargeExpected);

  const day1 = PRORATION_SCENARIOS[6];
  const credit1 = calculateProrationCredit(parseFloat(day1.oldPlan.monthlyPrice), day1.daysElapsed, day1.billingCycleDays);
  const charge1 = calculateProrationCharge(parseFloat(day1.newPlan.monthlyPrice), day1.daysRemaining, day1.billingCycleDays);
  assert.equal(credit1.creditFormatted, day1.unusedOldCreditExpected);
  assert.equal(charge1.chargeFormatted, day1.proratedNewChargeExpected);
});

test('Proration: Lateral plan switch with identical pricing yields zero net charge', () => {
  const scn = PRORATION_SCENARIOS[7];
  const credit = calculateProrationCredit(parseFloat(scn.oldPlan.monthlyPrice), scn.daysElapsed, scn.billingCycleDays);
  const charge = calculateProrationCharge(parseFloat(scn.newPlan.monthlyPrice), scn.daysRemaining, scn.billingCycleDays);

  assert.equal(credit.creditFormatted, charge.chargeFormatted);
  const netCents = charge.chargeCents - credit.creditCents;
  assert.equal(netCents, 0);
});

test('Proration: Parameter validation guards reject invalid inputs', () => {
  assert.throws(() => calculateProrationCredit(100, 10, 0), /totalDays must be greater than zero/);
  assert.throws(() => calculateProrationCredit(100, -1, 30), /daysElapsed must be between 0 and totalDays/);
  assert.throws(() => calculateProrationCredit(100, 35, 30), /daysElapsed must be between 0 and totalDays/);

  assert.throws(() => calculateProrationCharge(100, 10, -5), /totalDays must be greater than zero/);
  assert.throws(() => calculateProrationCharge(100, -2, 30), /daysRemaining must be between 0 and totalDays/);
  assert.throws(() => calculateProrationCharge(100, 31, 30), /daysRemaining must be between 0 and totalDays/);
});
