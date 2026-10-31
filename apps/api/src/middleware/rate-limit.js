import { AppError } from './errors.js';

const buckets = new Map();
export function rateLimit({ prefix, limit, windowMs }) {
  return (req, _res, next) => {
    const key = `${prefix}:${req.ip}`; const now = Date.now(); const current = buckets.get(key);
    const active = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    active.count += 1; buckets.set(key, active);
    return active.count > limit ? next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.')) : next();
  };
}
