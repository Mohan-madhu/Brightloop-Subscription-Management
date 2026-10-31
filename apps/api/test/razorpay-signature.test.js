import test from 'node:test';
import assert from 'node:assert/strict';
import { razorpaySignature, verifyRazorpaySignature } from '../src/services/razorpay-signature.js';

const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1' } } } }));

test('valid HMAC-SHA256 webhook signature is accepted', () => {
  const signature = razorpaySignature(body, 'test-secret');
  assert.equal(verifyRazorpaySignature(body, signature, 'test-secret'), true);
});

test('tampered body, wrong secret and missing signature are rejected', () => {
  const signature = razorpaySignature(body, 'test-secret');
  assert.equal(verifyRazorpaySignature(Buffer.from('{"event":"payment.captured"}'), signature, 'test-secret'), false);
  assert.equal(verifyRazorpaySignature(body, signature, 'other-secret'), false);
  assert.equal(verifyRazorpaySignature(body, '', 'test-secret'), false);
  assert.equal(verifyRazorpaySignature(body, signature, ''), false);
});
