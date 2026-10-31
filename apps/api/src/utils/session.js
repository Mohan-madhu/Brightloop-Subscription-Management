import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const sessionLifetimeMs = 8 * 60 * 60 * 1000;
export const hashToken = (value) => createHash('sha256').update(value).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
export const tokensMatch = (value, hash) => {
  const candidate = Buffer.from(hashToken(value));
  const expected = Buffer.from(hash);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
};
export const sessionExpiry = () => new Date(Date.now() + sessionLifetimeMs);
