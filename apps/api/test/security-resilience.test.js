import test from 'node:test';
import assert from 'node:assert/strict';
import { assertValidId, assertDateRange, bodyNote, optionalText, optionalBoolean, optionalDate } from '../src/modules/billing/validation.js';
import { razorpaySignature, verifyRazorpaySignature } from '../src/services/razorpay-signature.js';
import { buildMimeMessage } from '../src/services/email.js';
import { invoiceScopeWhere, paymentScopeWhere, subscriptionScopeWhere, ROLE, hasAnyRole, normalizeRoles } from '../src/modules/billing/access.js';
import { allocatePaymentToInvoice } from '../src/services/payment-rules.js';
import { isOverdue } from '../src/services/serializers.js';

test('Security: assertValidId blocks path traversal and shell injection strings', () => {
  const attackPayloads = [
    '../etc/passwd',
    '..\\windows\\system32',
    'id; DROP TABLE "Invoice";--',
    '<script>alert(1)</script>',
    'inv-123\0nullbyte',
    'inv 123 with space',
    'inv-123#fragment',
    'inv-123?query=1',
    'inv/123/nested',
    'a'.repeat(51) // Exceeds 50 chars
  ];

  for (const attack of attackPayloads) {
    assert.throws(() => {
      assertValidId(attack, 'testId');
    }, (err) => err.code === 'VALIDATION_ERROR' || /Invalid/.test(err.message), `Failed to reject attack vector: ${attack}`);
  }

  // Valid IDs must pass
  assert.equal(assertValidId('inv_clj83kds90001', 'invoiceId'), 'inv_clj83kds90001');
  assert.equal(assertValidId('CUID-123-abc_XYZ', 'id'), 'CUID-123-abc_XYZ');
});

test('Security: assertDateRange blocks inverted date spans', () => {
  assert.throws(() => {
    assertDateRange('2026-10-31', '2026-10-01', 'due date range');
  }, /start date is after the end date/);

  // Valid ranges must pass without throwing
  assertDateRange('2026-10-01', '2026-10-31', 'due date range');
  assertDateRange('2026-10-15', '2026-10-15', 'due date range');
  assertDateRange(undefined, '2026-10-31', 'due date range');
  assertDateRange('2026-10-01', undefined, 'due date range');
});

test('Security: bodyNote sanitizes whitespace and enforces 500-char maximum', () => {
  assert.equal(bodyNote('   note with padding   '), 'note with padding');
  assert.equal(bodyNote(''), null);
  assert.equal(bodyNote(null), null);
  assert.equal(bodyNote(undefined), null);

  const longNote = 'a'.repeat(501);
  assert.throws(() => {
    bodyNote(longNote);
  }, (err) => err.code === 'VALIDATION_ERROR' || /500 characters/.test(err.message));
});

test('Security: Webhook HMAC verification timing resilience with malformed inputs', () => {
  const secret = 'rzp_sec_test_12345';
  const body = Buffer.from('{"event":"payment.captured"}');

  // Must gracefully return false without crashing on malformed arguments
  assert.equal(verifyRazorpaySignature(null, 'sig', secret), false);
  assert.equal(verifyRazorpaySignature(undefined, 'sig', secret), false);
  assert.equal(verifyRazorpaySignature(body, null, secret), false);
  assert.equal(verifyRazorpaySignature(body, '', secret), false);
  assert.equal(verifyRazorpaySignature(body, 'sig', null), false);
  assert.equal(verifyRazorpaySignature(body, 'sig', ''), false);
  assert.equal(verifyRazorpaySignature({}, 'sig', secret), false);
  assert.equal(verifyRazorpaySignature(12345, 'sig', secret), false);
});

test('Security: Webhook constant-time signature comparison rejects altered signatures', () => {
  const secret = 'rzp_sec_test_secret';
  const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', id: 'pay_999' }));
  const validSig = razorpaySignature(rawBody, secret);

  assert.equal(verifyRazorpaySignature(rawBody, validSig, secret), true);

  // Flip one hex character in the signature
  const corruptedChar = validSig[0] === 'a' ? 'b' : 'a';
  const corruptedSig = corruptedChar + validSig.slice(1);
  assert.equal(verifyRazorpaySignature(rawBody, corruptedSig, secret), false);

  // Different length signature (immediate length mismatch rejection)
  assert.equal(verifyRazorpaySignature(rawBody, validSig.slice(0, -2), secret), false);
  assert.equal(verifyRazorpaySignature(rawBody, validSig + '00', secret), false);
});

test('Security: MIME message prevents header injection via CRLF', () => {
  const maliciousRecipient = 'legit@company.test\r\nBcc: attacker@evil.test\r\nSubject: Injected';
  const maliciousSubject = 'Invoice 1001\r\nX-Spam: High\r\nTo: hacked@evil.test';

  const mime = buildMimeMessage({
    from: 'billing@brightloop.test\r\nReply-To: attacker@evil.test',
    to: maliciousRecipient,
    subject: maliciousSubject,
    text: 'Body content',
    html: '<p>Body content</p>'
  });

  // CRLF characters must be flattened to spaces, preventing line splitting into new headers
  assert.ok(!/^Bcc:/m.test(mime));
  assert.ok(!/^X-Spam:/m.test(mime));
  assert.ok(!/^Reply-To:/m.test(mime));
});

test('Security: Customer role record scoping prevents accessing other tenant data', async () => {
  const mockTenant1 = { userId: 'usr_t1', roles: [ROLE.CUSTOMER], customerId: 'cust_tenant_1' };
  const mockTenant2 = { userId: 'usr_t2', roles: [ROLE.CUSTOMER], customerId: 'cust_tenant_2' };

  const invoiceScope1 = await invoiceScopeWhere(mockTenant1);
  const invoiceScope2 = await invoiceScopeWhere(mockTenant2);

  assert.deepEqual(invoiceScope1, { customerId: 'cust_tenant_1' });
  assert.deepEqual(invoiceScope2, { customerId: 'cust_tenant_2' });

  // Payment scopes must cascade to invoice.customerId
  const paymentScope1 = await paymentScopeWhere(mockTenant1);
  const paymentScope2 = await paymentScopeWhere(mockTenant2);

  assert.deepEqual(paymentScope1, { invoice: { customerId: 'cust_tenant_1' } });
  assert.deepEqual(paymentScope2, { invoice: { customerId: 'cust_tenant_2' } });

  // Subscription scopes must cascade to customerId
  const subScope1 = await subscriptionScopeWhere(mockTenant1);
  assert.deepEqual(subScope1, { customerId: 'cust_tenant_1' });
});

test('Security: Marketing role is restricted strictly to assigned customers', async () => {
  const marketingActor = { userId: 'usr_mkt_1', roles: [ROLE.MARKETING] };
  const scope = await invoiceScopeWhere(marketingActor);

  assert.deepEqual(scope, {
    customer: { assignments: { some: { userId: 'usr_mkt_1' } } }
  });
});

test('Security: Admin and Finance have organization-wide billing visibility', async () => {
  const adminActor = { userId: 'usr_adm', roles: [ROLE.ADMIN] };
  const financeActor = { userId: 'usr_fin', roles: [ROLE.FINANCE] };

  assert.deepEqual(await invoiceScopeWhere(adminActor), {});
  assert.deepEqual(await invoiceScopeWhere(financeActor), {});
  assert.deepEqual(await paymentScopeWhere(adminActor), { invoice: {} });
  assert.deepEqual(await paymentScopeWhere(financeActor), { invoice: {} });
});

test('Security: Payment allocation rejects overpayment and zero payment', () => {
  const balance = '500.00';

  // Zero payment
  assert.throws(() => allocatePaymentToInvoice({ balance, amount: '0.00' }), /greater than zero/);
  // Negative payment
  assert.throws(() => allocatePaymentToInvoice({ balance, amount: '-50.00' }), /greater than zero/);
  // Overpayment (500.01 against 500.00)
  assert.throws(() => allocatePaymentToInvoice({ balance, amount: '500.01' }), /exceeds the outstanding balance/);
});

test('Security: Overdue status cannot be spoofed by invoice status field', () => {
  const pastDueDate = new Date('2026-01-01');
  const futureDueDate = new Date('2026-12-31');

  // PAID invoice is NEVER overdue even if dueDate is past
  assert.equal(isOverdue({ status: 'PAID', dueDate: pastDueDate, balance: '0.00' }, '2026-10-31'), false);

  // CANCELLED invoice is NEVER overdue
  assert.equal(isOverdue({ status: 'CANCELLED', dueDate: pastDueDate, balance: '100.00' }, '2026-10-31'), false);

  // DRAFT invoice is NEVER overdue
  assert.equal(isOverdue({ status: 'DRAFT', dueDate: pastDueDate, balance: '100.00' }, '2026-10-31'), false);

  // Zero balance invoice is NEVER overdue
  assert.equal(isOverdue({ status: 'CONFIRMED', dueDate: pastDueDate, balance: '0.00' }, '2026-10-31'), false);

  // Future due date is NOT overdue
  assert.equal(isOverdue({ status: 'CONFIRMED', dueDate: futureDueDate, balance: '100.00' }, '2026-10-31'), false);

  // Only open invoice with balance > 0 and past due date is overdue
  assert.equal(isOverdue({ status: 'CONFIRMED', dueDate: pastDueDate, balance: '100.00' }, '2026-10-31'), true);
  assert.equal(isOverdue({ status: 'PARTIALLY_PAID', dueDate: pastDueDate, balance: '50.00' }, '2026-10-31'), true);
  assert.equal(isOverdue({ status: 'SENT', dueDate: pastDueDate, balance: '500.00' }, '2026-10-31'), true);
});

test('Security: Role normalization handles mixed string and object roles defensively', () => {
  const mixedRoles = ['admin', { code: 'finance' }, { role: { code: 'marketing' } }, null, undefined, ''];
  const normalized = normalizeRoles(mixedRoles);
  assert.deepEqual(normalized, ['ADMIN', 'FINANCE', 'MARKETING']);

  assert.equal(hasAnyRole({ roles: mixedRoles }, ['ADMIN']), true);
  assert.equal(hasAnyRole({ roles: mixedRoles }, ['SUPERADMIN']), false);
});
