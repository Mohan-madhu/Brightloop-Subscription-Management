/**
 * Comprehensive mock audit ledger dataset containing 300 deterministic
 * status log entries across Invoices, Payments, and Subscriptions.
 * Validates state transition history, actor tracking, and chronological monotonicity.
 */

export function buildMockAuditLedger(count = 300) {
  const entries = [];
  const entityTypes = ['INVOICE', 'PAYMENT', 'SUBSCRIPTION'];
  const invoiceStatuses = ['DRAFT', 'CONFIRMED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'];
  const paymentStatuses = ['PENDING', 'CONFIRMED', 'FAILED'];
  const subscriptionStatuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED'];
  const actors = ['usr_admin_01', 'usr_finance_01', 'usr_system_scheduler', 'usr_billing_worker'];

  let baseTime = 1761895200; // Sat Oct 31 2025/2026

  for (let i = 1; i <= count; i += 1) {
    const entityType = entityTypes[(i - 1) % entityTypes.length];
    const actor = actors[(i - 1) % actors.length];
    baseTime += (i * 60) + 120;
    const createdAt = new Date(baseTime * 1000).toISOString();

    if (entityType === 'INVOICE') {
      const status = invoiceStatuses[(i - 1) % invoiceStatuses.length];
      const invoiceId = `inv_audit_${String((i % 50) + 1).padStart(4, '0')}`;
      entries.push({
        id: `audit_log_${String(i).padStart(5, '0')}`,
        entityType,
        entityId: invoiceId,
        invoiceId,
        status,
        note: `Transitioned invoice to ${status} by ${actor}.`,
        actorId: actor,
        createdAt
      });
    } else if (entityType === 'PAYMENT') {
      const status = paymentStatuses[(i - 1) % paymentStatuses.length];
      const paymentId = `pay_audit_${String((i % 50) + 1).padStart(4, '0')}`;
      entries.push({
        id: `audit_log_${String(i).padStart(5, '0')}`,
        entityType,
        entityId: paymentId,
        paymentId,
        status,
        note: `Payment recorded with status ${status}. Provider verification completed.`,
        actorId: actor,
        createdAt
      });
    } else {
      const status = subscriptionStatuses[(i - 1) % subscriptionStatuses.length];
      const subscriptionId = `sub_audit_${String((i % 50) + 1).padStart(4, '0')}`;
      entries.push({
        id: `audit_log_${String(i).padStart(5, '0')}`,
        entityType,
        entityId: subscriptionId,
        subscriptionId,
        status,
        note: `Subscription lifecycle progressed to ${status}.`,
        effectiveAt: createdAt,
        actorId: actor,
        createdAt
      });
    }
  }

  return entries;
}

export const MOCK_AUDIT_LEDGER = Object.freeze(buildMockAuditLedger(300));
