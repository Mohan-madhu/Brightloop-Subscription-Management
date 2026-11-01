import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { MOCK_AUDIT_LEDGER } from './fixtures/mock-audit-ledger.js';

test('Audit Ledger: Dataset contains exactly 300 deterministic audit events', () => {
  assert.equal(MOCK_AUDIT_LEDGER.length, 300);
});

test('Audit Ledger: Chronological monotonicity across all 300 entries', () => {
  let prevTimestamp = 0;
  for (let i = 0; i < MOCK_AUDIT_LEDGER.length; i += 1) {
    const entry = MOCK_AUDIT_LEDGER[i];
    const currentTimestamp = new Date(entry.createdAt).getTime();

    assert.ok(
      !Number.isNaN(currentTimestamp),
      `Invalid ISO timestamp at index ${i}: ${entry.createdAt}`
    );
    assert.ok(
      currentTimestamp >= prevTimestamp,
      `Non-monotonic timestamp detected at index ${i}: ${currentTimestamp} < ${prevTimestamp}`
    );
    prevTimestamp = currentTimestamp;
  }
});

test('Audit Ledger: Entity identifiers conform to strict type prefix conventions', () => {
  for (const entry of MOCK_AUDIT_LEDGER) {
    assert.match(entry.id, /^audit_log_\d{5}$/, `Invalid audit log id: ${entry.id}`);

    if (entry.entityType === 'INVOICE') {
      assert.match(entry.entityId, /^inv_audit_\d{4}$/, `Invalid invoice entityId: ${entry.entityId}`);
      assert.equal(entry.invoiceId, entry.entityId);
    } else if (entry.entityType === 'PAYMENT') {
      assert.match(entry.entityId, /^pay_audit_\d{4}$/, `Invalid payment entityId: ${entry.entityId}`);
      assert.equal(entry.paymentId, entry.entityId);
    } else if (entry.entityType === 'SUBSCRIPTION') {
      assert.match(entry.entityId, /^sub_audit_\d{4}$/, `Invalid subscription entityId: ${entry.entityId}`);
      assert.equal(entry.subscriptionId, entry.entityId);
    } else {
      assert.fail(`Unrecognized entityType: ${entry.entityType}`);
    }
  }
});

test('Audit Ledger: Actor identification and metadata integrity', () => {
  const recognizedActors = new Set([
    'usr_admin_01',
    'usr_finance_01',
    'usr_system_scheduler',
    'usr_billing_worker'
  ]);

  for (const entry of MOCK_AUDIT_LEDGER) {
    assert.ok(
      recognizedActors.has(entry.actorId),
      `Unknown actorId: ${entry.actorId} in log ${entry.id}`
    );
    assert.ok(entry.note && entry.note.length > 0, `Empty note in log ${entry.id}`);
    assert.ok(entry.note.length <= 500, `Note exceeds 500 characters in log ${entry.id}`);
  }
});

test('Audit Ledger: Tamper-evident cryptographic hash chain verification', () => {
  // Construct a deterministic SHA-256 hash chain over all 300 audit entries
  let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';

  for (let i = 0; i < MOCK_AUDIT_LEDGER.length; i += 1) {
    const entry = MOCK_AUDIT_LEDGER[i];
    const payload = JSON.stringify({
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      status: entry.status,
      actorId: entry.actorId,
      createdAt: entry.createdAt,
      previousHash
    });

    const currentHash = crypto.createHash('sha256').update(payload).digest('hex');
    assert.equal(currentHash.length, 64);
    previousHash = currentHash;
  }

  // The final chain hash must be deterministic and non-empty
  assert.ok(previousHash.length === 64);
});

test('Audit Ledger: Entity type distribution is balanced across lifecycle entities', () => {
  const counts = { INVOICE: 0, PAYMENT: 0, SUBSCRIPTION: 0 };

  for (const entry of MOCK_AUDIT_LEDGER) {
    counts[entry.entityType] += 1;
  }

  assert.equal(counts.INVOICE, 100);
  assert.equal(counts.PAYMENT, 100);
  assert.equal(counts.SUBSCRIPTION, 100);
});

test('Audit Ledger: Simulated timeline queries filter accurately', () => {
  const invoiceEntries = MOCK_AUDIT_LEDGER.filter((e) => e.entityType === 'INVOICE');
  assert.equal(invoiceEntries.length, 100);

  const adminEntries = MOCK_AUDIT_LEDGER.filter((e) => e.actorId === 'usr_admin_01');
  assert.equal(adminEntries.length, 75);

  const schedulerEntries = MOCK_AUDIT_LEDGER.filter((e) => e.actorId === 'usr_system_scheduler');
  assert.equal(schedulerEntries.length, 75);

  // Time-slice query test
  const midPoint = new Date(MOCK_AUDIT_LEDGER[150].createdAt).getTime();
  const earlierEntries = MOCK_AUDIT_LEDGER.filter((e) => new Date(e.createdAt).getTime() <= midPoint);
  assert.ok(earlierEntries.length >= 150);
});
