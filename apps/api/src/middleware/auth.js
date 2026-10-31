import { prisma } from '../db/prisma.js';
import { AppError } from './errors.js';
import { hashToken, tokensMatch } from '../utils/session.js';

function readCookie(header, name) {
  const item = header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

export async function requireAuth(req, _res, next) {
  const token = readCookie(req.get('cookie'), 'bl_session');
  if (!token) return next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'A valid session is required.'));
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { include: { roles: { include: { role: true } }, customer: { select: { id: true } } } } } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) return next(new AppError(401, 'INVALID_SESSION', 'The session is invalid or expired.'));
  req.auth = { userId: session.user.id, kind: session.user.kind, roles: session.user.roles.map(({ role }) => role.code), customerId: session.user.customer?.id ?? null, sessionId: session.id, csrfTokenHash: session.csrfTokenHash };
  return next();
}

export function requireCsrf(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== process.env.WEB_ORIGIN) return next(new AppError(403, 'FORBIDDEN', 'Request origin is not allowed.'));
  const token = req.get('x-csrf-token');
  return token && tokensMatch(token, req.auth?.csrfTokenHash ?? '') ? next() : next(new AppError(403, 'CSRF_VALIDATION_FAILED', 'CSRF validation failed.'));
}

export function requireRole(...roles) {
  return (req, _res, next) => req.auth?.roles.some((role) => roles.includes(role)) ? next() : next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
}

export async function requireCustomerAccess(req, _res, next) {
  const customerId = req.params.customerId ?? req.params.id;
  if (!customerId) return next(new AppError(400, 'VALIDATION_ERROR', 'A customer ID is required.'));
  if (req.auth.roles.includes('ADMIN') || req.auth.roles.includes('FINANCE') || req.auth.customerId === customerId) return next();
  if (!req.auth.roles.includes('MARKETING')) return next(new AppError(403, 'FORBIDDEN', 'You do not have access to this customer.'));
  const assignment = await prisma.customerAssignment.findUnique({ where: { customerId_userId: { customerId, userId: req.auth.userId } } });
  return assignment ? next() : next(new AppError(403, 'FORBIDDEN', 'You do not have access to this customer.'));
}
