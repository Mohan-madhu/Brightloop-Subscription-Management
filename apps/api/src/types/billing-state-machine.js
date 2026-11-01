/**
 * Brightloop Billing & Subscription State Machine Rules & Transition Guards.
 *
 * Implements deterministic finite state machines (FSM) for Invoices, Payments,
 * and Subscriptions with strict guard assertions to prevent invalid lifecycle jumps.
 */

import { AppError } from '../middleware/errors.js';

export const INVOICE_STATES = Object.freeze({
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  SENT: 'SENT',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED'
});

export const PAYMENT_STATES = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
});

export const SUBSCRIPTION_STATES = Object.freeze({
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CLOSED: 'CLOSED',
  EXPIRED: 'EXPIRED'
});

/**
 * Permitted forward transitions for Invoices.
 * Key: Current state, Value: Array of allowed target states.
 */
export const INVOICE_TRANSITIONS = Object.freeze({
  [INVOICE_STATES.DRAFT]: [INVOICE_STATES.CONFIRMED, INVOICE_STATES.CANCELLED],
  [INVOICE_STATES.CONFIRMED]: [INVOICE_STATES.SENT, INVOICE_STATES.PARTIALLY_PAID, INVOICE_STATES.PAID, INVOICE_STATES.CANCELLED],
  [INVOICE_STATES.SENT]: [INVOICE_STATES.PARTIALLY_PAID, INVOICE_STATES.PAID, INVOICE_STATES.CANCELLED],
  [INVOICE_STATES.PARTIALLY_PAID]: [INVOICE_STATES.PAID], // Cannot cancel partially paid invoice without refund/credit note
  [INVOICE_STATES.PAID]: [],                              // Terminal state (except via refund / credit note)
  [INVOICE_STATES.CANCELLED]: []                          // Terminal state
});

/**
 * Permitted transitions for Payments.
 */
export const PAYMENT_TRANSITIONS = Object.freeze({
  [PAYMENT_STATES.PENDING]: [PAYMENT_STATES.CONFIRMED, PAYMENT_STATES.FAILED],
  [PAYMENT_STATES.CONFIRMED]: [PAYMENT_STATES.REFUNDED],
  [PAYMENT_STATES.FAILED]: [],
  [PAYMENT_STATES.REFUNDED]: []
});

/**
 * Permitted transitions for Subscriptions.
 */
export const SUBSCRIPTION_TRANSITIONS = Object.freeze({
  [SUBSCRIPTION_STATES.DRAFT]: [SUBSCRIPTION_STATES.ACTIVE, SUBSCRIPTION_STATES.CLOSED],
  [SUBSCRIPTION_STATES.ACTIVE]: [SUBSCRIPTION_STATES.PAUSED, SUBSCRIPTION_STATES.CLOSED, SUBSCRIPTION_STATES.EXPIRED],
  [SUBSCRIPTION_STATES.PAUSED]: [SUBSCRIPTION_STATES.ACTIVE, SUBSCRIPTION_STATES.CLOSED, SUBSCRIPTION_STATES.EXPIRED],
  [SUBSCRIPTION_STATES.CLOSED]: [],
  [SUBSCRIPTION_STATES.EXPIRED]: []
});

/**
 * Checks whether an invoice transition is structurally allowed.
 * @param {string} fromState
 * @param {string} toState
 * @param {object} [context]
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function validateInvoiceTransition(fromState, toState, context = {}) {
  const allowedTargets = INVOICE_TRANSITIONS[fromState];
  if (!allowedTargets) {
    return { allowed: false, reason: `Unknown source invoice state: ${fromState}` };
  }

  if (!allowedTargets.includes(toState)) {
    return {
      allowed: false,
      reason: `Illegal state transition from ${fromState} to ${toState}.`
    };
  }

  // Guard: Cannot cancel if invoice has non-zero amount paid
  if (toState === INVOICE_STATES.CANCELLED && context.amountPaid && parseFloat(context.amountPaid) > 0) {
    return {
      allowed: false,
      reason: 'Cannot cancel an invoice with recorded payments. Issue a credit note instead.'
    };
  }

  // Guard: Cannot transition to PAID if remaining balance is greater than zero
  if (toState === INVOICE_STATES.PAID && context.amountDue && parseFloat(context.amountDue) > 0) {
    return {
      allowed: false,
      reason: `Cannot transition invoice to PAID while outstanding balance is ${context.amountDue}.`
    };
  }

  return { allowed: true };
}

/**
 * Asserts that an invoice transition is valid; throws AppError if invalid.
 */
export function assertValidInvoiceTransition(fromState, toState, context = {}) {
  const result = validateInvoiceTransition(fromState, toState, context);
  if (!result.allowed) {
    throw new AppError(409, 'INVALID_STATE_TRANSITION', result.reason || 'Invalid invoice state transition.');
  }
}

/**
 * Validates payment state machine transitions.
 */
export function validatePaymentTransition(fromState, toState) {
  const allowedTargets = PAYMENT_TRANSITIONS[fromState];
  if (!allowedTargets) {
    return { allowed: false, reason: `Unknown source payment state: ${fromState}` };
  }
  if (!allowedTargets.includes(toState)) {
    return { allowed: false, reason: `Illegal payment transition from ${fromState} to ${toState}.` };
  }
  return { allowed: true };
}

/**
 * Asserts that a payment transition is valid.
 */
export function assertValidPaymentTransition(fromState, toState) {
  const result = validatePaymentTransition(fromState, toState);
  if (!result.allowed) {
    throw new AppError(409, 'INVALID_PAYMENT_STATE', result.reason || 'Invalid payment transition.');
  }
}

/**
 * Validates subscription state machine transitions.
 */
export function validateSubscriptionTransition(fromState, toState) {
  const allowedTargets = SUBSCRIPTION_TRANSITIONS[fromState];
  if (!allowedTargets) {
    return { allowed: false, reason: `Unknown source subscription state: ${fromState}` };
  }
  if (!allowedTargets.includes(toState)) {
    return { allowed: false, reason: `Illegal subscription transition from ${fromState} to ${toState}.` };
  }
  return { allowed: true };
}

/**
 * Asserts that a subscription transition is valid.
 */
export function assertValidSubscriptionTransition(fromState, toState) {
  const result = validateSubscriptionTransition(fromState, toState);
  if (!result.allowed) {
    throw new AppError(409, 'INVALID_SUBSCRIPTION_STATE', result.reason || 'Invalid subscription transition.');
  }
}
