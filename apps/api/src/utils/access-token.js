import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

const tokenLifetimeSeconds = 60 * 60 * 8;
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const decode = (value) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
const sign = (value) => createHmac('sha256', env.AUTH_TOKEN_SECRET).update(value).digest('base64url');

export function createAccessToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const body = encode({ sub: userId, iat: now, exp: now + tokenLifetimeSeconds });
  return `${body}.${sign(body)}`;
}

export function verifyAccessToken(token) {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const payload = decode(body);
    return typeof payload.sub === 'string' && typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch { return null; }
}
