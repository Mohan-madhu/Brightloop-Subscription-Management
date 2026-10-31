import { createHmac, timingSafeEqual } from 'node:crypto';

export function razorpaySignature(rawBody, secret) {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifyRazorpaySignature(rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!secret || !signature) return false;
  const expected = razorpaySignature(rawBody, secret);
  const actual = String(signature).trim().toLowerCase();
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
