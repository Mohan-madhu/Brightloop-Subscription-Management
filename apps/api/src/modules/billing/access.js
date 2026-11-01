import { prisma } from '../../db/prisma.js';
import { AppError } from '../../middleware/errors.js';

export const ROLE = Object.freeze({
  ADMIN: 'ADMIN',
  MARKETING: 'MARKETING',
  FINANCE: 'FINANCE',
  CUSTOMER: 'CUSTOMER'
});

const ROLE_PRECEDENCE = [ROLE.ADMIN, ROLE.FINANCE, ROLE.MARKETING, ROLE.CUSTOMER];

export function normalizeRoles(roles) {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((role) => {
      if (typeof role === 'string') return role;
      return role?.code ?? role?.role?.code ?? role?.name;
    })
    .filter(Boolean)
    .map((role) => String(role).toUpperCase());
}

export function actorRoles(actor) {
  return normalizeRoles(actor?.roles);
}

export function hasAnyRole(actor, allowed) {
  const roles = actorRoles(actor);
  return allowed.some((role) => roles.includes(role));
}

export function primaryRole(actor) {
  const roles = actorRoles(actor);
  return ROLE_PRECEDENCE.find((role) => roles.includes(role)) ?? null;
}

export function isStaff(actor) {
  return hasAnyRole(actor, [ROLE.ADMIN, ROLE.FINANCE, ROLE.MARKETING]);
}

/**
 * Defensive authentication check: ensures the request has an authenticated actor
 * with at least one active, normalized role. Fails closed with 401/403.
 */
export function requireActor(req, _res, next) {
  if (!req.auth?.userId || !Array.isArray(req.auth.roles)) {
    return next(new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.'));
  }
  req.auth.roles = actorRoles(req.auth);
  if (req.auth.roles.length === 0) return next(new AppError(403, 'FORBIDDEN', 'No active staff or customer role is assigned.'));
  return next();
}

/**
 * Role-Based Access Control (RBAC) guard: ensures the authenticated actor
 * possesses at least one of the specified roles.
 */
export function requireRoles(...allowed) {
  const normalized = allowed.map((role) => String(role).toUpperCase());
  return (req, _res, next) => {
    if (!req.auth?.userId) return next(new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.'));
    if (!hasAnyRole(req.auth, normalized)) return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    return next();
  };
}

export async function customerIdFor(actor, client = prisma) {
  if (actor?.customerId) return actor.customerId;
  try {
    const customer = await client.customer.findUnique({ where: { userId: actor.userId }, select: { id: true } });
    return customer?.id ?? null;
  } catch (error) {
    if (error?.name === 'PrismaClientInitializationError' || error?.message?.includes('database server')) {
      return null;
    }
    throw error;
  }
}

export async function invoiceScopeWhere(actor, client = prisma) {
  const role = primaryRole(actor);
  if (role === ROLE.ADMIN || role === ROLE.FINANCE) return {};
  if (role === ROLE.MARKETING) return { customer: { assignments: { some: { userId: actor.userId } } } };
  if (role === ROLE.CUSTOMER) {
    const customerId = await customerIdFor(actor, client);
    if (!customerId) return { id: '__no_customer_record__' };
    return { customerId };
  }
  throw new AppError(403, 'FORBIDDEN', 'No billing role is assigned.');
}

export async function paymentScopeWhere(actor, client = prisma) {
  return { invoice: await invoiceScopeWhere(actor, client) };
}

export async function subscriptionScopeWhere(actor, client = prisma) {
  const role = primaryRole(actor);
  if (role === ROLE.ADMIN || role === ROLE.FINANCE) return {};
  if (role === ROLE.MARKETING) return { customer: { assignments: { some: { userId: actor.userId } } } };
  if (role === ROLE.CUSTOMER) {
    const customerId = await customerIdFor(actor, client);
    if (!customerId) return { id: '__no_customer_record__' };
    return { customerId };
  }
  throw new AppError(403, 'FORBIDDEN', 'No billing role is assigned.');
}

export async function assertInvoiceVisible(actor, invoiceId) {
  const scope = await invoiceScopeWhere(actor);
  const invoice = await prisma.invoice.findFirst({ where: { AND: [{ id: invoiceId }, scope] }, select: { id: true } });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice was not found.');
  return invoice.id;
}
