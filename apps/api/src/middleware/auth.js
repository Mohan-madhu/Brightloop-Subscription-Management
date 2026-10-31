import { prisma } from '../db/prisma.js';
import { AppError } from './errors.js';
import { verifyAccessToken } from '../utils/access-token.js';

export async function requireAuth(req, _res, next) {
  const authorization = req.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'A valid access token is required.'));
  const payload = verifyAccessToken(authorization.slice(7));
  if (!payload) return next(new AppError(401, 'INVALID_ACCESS_TOKEN', 'The access token is invalid or expired.'));
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { roles: { include: { role: true } }, customer: { select: { id: true } } } });
  if (!user || !user.isActive) return next(new AppError(401, 'INVALID_ACCESS_TOKEN', 'The access token is invalid or expired.'));
  req.auth = { userId: user.id, kind: user.kind, roles: user.roles.map(({ role }) => role.code), customerId: user.customer?.id ?? null };
  return next();
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
