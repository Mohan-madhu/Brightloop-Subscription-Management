import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Computes HMAC-SHA256 digest of raw request payload against the configured webhook secret.
 *
 * @param {Buffer|string} rawBody - Raw webhook request body before JSON parsing
 * @param {string} secret - Razorpay webhook secret
 * @returns {string} Hex-encoded HMAC-SHA256 digest
 */
export function razorpaySignature(rawBody, secret) {
  if (!rawBody || (!Buffer.isBuffer(rawBody) && typeof rawBody !== 'string')) {
    throw new Error('rawBody must be a Buffer or string.');
  }
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

/**
 * Validates a Razorpay webhook signature using constant-time buffer comparison
 * to eliminate timing-side-channel attacks.
 *
 * @param {Buffer|string} rawBody - Raw body buffer of the incoming webhook
 * @param {string} signature - Value from x-razorpay-signature header
 * @param {string} secret - Shared webhook secret
 * @returns {boolean} True if signature matches, false otherwise
 */
export function verifyRazorpaySignature(rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!rawBody || !secret || !signature) return false;
  if (!Buffer.isBuffer(rawBody) && typeof rawBody !== 'string') return false;
  try {
    const expected = razorpaySignature(rawBody, secret);
    const actual = String(signature).trim().toLowerCase();
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(actual, 'utf8'));
  } catch {
    return false;
  }
}
