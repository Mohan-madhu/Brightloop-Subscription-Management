import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../middleware/errors.js';
import { requireAuth, requireCsrf } from '../../middleware/auth.js';
import { parsePagination } from '../../middleware/validate.js';

export const salesRouter = Router();
const money = z.string().regex(/^\d+(\.\d{1,2})?$/);
const line = z.object({ productId: z.string().cuid(), variantId: z.string().cuid().nullable().optional(), description: z.string().trim().min(1).max(500), quantity: z.number().int().positive(), unitPrice: money });
const quoteInput = z.object({ customerId: z.string().cuid(), validUntil: z.string().date().nullable().optional(), terms: z.string().max(8000).nullable().optional(), lines: z.array(line).min(1) });
const acceptanceInput = z.object({ planId: z.string().cuid(), startDate: z.string().date(), expiryDate: z.string().date().nullable().optional(), paymentTerms: z.string().max(500).nullable().optional() });
const nextNumber = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

async function canAccessCustomer(auth, customerId, client = prisma) {
  if (auth.roles.includes('ADMIN') || auth.roles.includes('FINANCE') || auth.customerId === customerId) return true;
  return auth.roles.includes('MARKETING') && Boolean(await client.customerAssignment.findUnique({ where: { customerId_userId: { customerId, userId: auth.userId } } }));
}
async function quoteForRequest(req, client = prisma) {
  const quote = await client.quotation.findUnique({ where: { id: z.string().cuid().parse(req.params.id) }, include: { lines: true, subscription: true } });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found.');
  if (!(await canAccessCustomer(req.auth, quote.customerId, client))) throw new AppError(403, 'FORBIDDEN', 'You do not have access to this quotation.');
  return quote;
}

salesRouter.get('/quotations', requireAuth, async (req, res) => {
  const { page, pageSize, skip, orderBy } = parsePagination(req.query, { allowedSort: ['createdAt', 'updatedAt', 'number', 'status'] });
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
  if (status && !['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].includes(status)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid quotation status.');
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const visible = req.auth.roles.includes('ADMIN') || req.auth.roles.includes('FINANCE') ? {} : req.auth.roles.includes('MARKETING') ? { customer: { assignments: { some: { userId: req.auth.userId } } } } : { customerId: req.auth.customerId ?? '__none__' };
  const where = { AND: [visible, ...(status ? [{ status }] : []), ...(search ? [{ number: { contains: search, mode: 'insensitive' } }] : [])] };
  const [data, total] = await prisma.$transaction([
    prisma.quotation.findMany({ where, skip, take: pageSize, orderBy: orderBy ?? { createdAt: 'desc' }, include: { customer: { select: { id: true, legalName: true, billingEmail: true } }, lines: true, subscription: true } }),
    prisma.quotation.count({ where })
  ]);
  res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
});

salesRouter.post('/quotations', requireAuth, requireCsrf, async (req, res) => {
  const input = quoteInput.parse(req.body);
  if (!(await canAccessCustomer(req.auth, input.customerId))) throw new AppError(403, 'FORBIDDEN', 'You do not have access to this customer.');
  const data = await prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.create({ data: { number: nextNumber('QT'), customerId: input.customerId, validUntil: input.validUntil ? new Date(input.validUntil) : null, terms: input.terms ?? null, lines: { create: input.lines.map((item) => ({ ...item, variantId: item.variantId ?? null })) } }, include: { lines: true } });
    await tx.quotationStatusLog.create({ data: { quotationId: quotation.id, status: 'DRAFT', note: 'Created' } });
    return quotation;
  });
  res.status(201).json({ data });
});
salesRouter.get('/quotations/:id', requireAuth, async (req, res) => res.json({ data: await quoteForRequest(req) }));
salesRouter.post('/quotations/:id/accept', requireAuth, requireCsrf, async (req, res) => {
  const input = acceptanceInput.parse(req.body);
  const data = await prisma.$transaction(async (tx) => {
    const quotation = await quoteForRequest(req, tx);
    if (quotation.subscription) return quotation.subscription;
    if (!['DRAFT', 'SENT'].includes(quotation.status)) throw new AppError(409, 'INVALID_TRANSITION', 'Only draft or sent quotations can be accepted.');
    const plan = await tx.plan.findUnique({ where: { id: input.planId } });
    if (!plan) throw new AppError(400, 'VALIDATION_ERROR', 'Plan not found.');
    const startDate = new Date(input.startDate);
    const subscription = await tx.subscription.create({ data: { number: nextNumber('SUB'), customerId: quotation.customerId, planId: plan.id, quotationId: quotation.id, status: 'CONFIRMED', startDate, expiryDate: input.expiryDate ? new Date(input.expiryDate) : null, billingAnchorDay: startDate.getUTCDate(), paymentTerms: input.paymentTerms ?? null, lines: { create: quotation.lines.map((item) => ({ productId: item.productId, variantId: item.variantId, description: item.description, quantity: item.quantity, agreedPrice: item.unitPrice })) } }, include: { lines: true } });
    await tx.quotation.update({ where: { id: quotation.id }, data: { status: 'ACCEPTED' } });
    await tx.quotationStatusLog.create({ data: { quotationId: quotation.id, status: 'ACCEPTED', note: `Converted to ${subscription.number}` } });
    await tx.subscriptionStatusLog.create({ data: { subscriptionId: subscription.id, status: 'CONFIRMED', note: 'Created from accepted quotation' } });
    return subscription;
  });
  res.status(201).json({ data });
});
salesRouter.get('/subscriptions/:id', requireAuth, async (req, res) => {
  const data = await prisma.subscription.findUnique({ where: { id: z.string().cuid().parse(req.params.id) }, include: { lines: true, logs: { orderBy: { createdAt: 'asc' } }, plan: true } });
  if (!data) throw new AppError(404, 'NOT_FOUND', 'Subscription not found.');
  if (!(await canAccessCustomer(req.auth, data.customerId))) throw new AppError(403, 'FORBIDDEN', 'You do not have access to this subscription.');
  res.json({ data });
});

salesRouter.get('/subscriptions', requireAuth, async (req, res) => {
  const { page, pageSize, skip, orderBy } = parsePagination(req.query, { allowedSort: ['createdAt', 'updatedAt', 'number', 'status'] });
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
  if (status && !['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED'].includes(status)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid subscription status.');
  const visible = req.auth.roles.includes('ADMIN') || req.auth.roles.includes('FINANCE') ? {} : req.auth.roles.includes('MARKETING') ? { customer: { assignments: { some: { userId: req.auth.userId } } } } : { customerId: req.auth.customerId ?? '__none__' };
  const where = { AND: [visible, ...(status ? [{ status }] : [])] };
  const [data, total] = await prisma.$transaction([
    prisma.subscription.findMany({ where, skip, take: pageSize, orderBy: orderBy ?? { createdAt: 'desc' }, include: { customer: { select: { id: true, legalName: true } }, plan: { include: { billingInterval: true } }, lines: true } }),
    prisma.subscription.count({ where })
  ]);
  res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
});
salesRouter.post('/subscriptions/:id/actions', requireAuth, requireCsrf, async (req, res) => {
  const id = z.string().cuid().parse(req.params.id); const { action } = z.object({ action: z.enum(['ACTIVATE', 'PAUSE', 'RESUME', 'RENEW', 'CLOSE']) }).parse(req.body);
  const subscription = await prisma.subscription.findUnique({ where: { id }, include: { plan: { include: { billingInterval: true } } } });
  if (!subscription) throw new AppError(404, 'NOT_FOUND', 'Subscription not found.');
  if (!(await canAccessCustomer(req.auth, subscription.customerId))) throw new AppError(403, 'FORBIDDEN', 'You do not have access to this subscription.');
  const transitions = { ACTIVATE: { from: ['CONFIRMED'], to: 'ACTIVE' }, PAUSE: { from: ['ACTIVE'], to: 'PAUSED' }, RESUME: { from: ['PAUSED'], to: 'ACTIVE' }, RENEW: { from: ['ACTIVE', 'PAUSED', 'CLOSED'], to: 'ACTIVE' }, CLOSE: { from: ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED'], to: 'CLOSED' } };
  const transition = transitions[action];
  if (!transition.from.includes(subscription.status)) throw new AppError(409, 'INVALID_TRANSITION', 'This lifecycle action is not allowed from the current status.');
  if (action === 'PAUSE' && !subscription.plan.allowPause) throw new AppError(409, 'INVALID_TRANSITION', 'This plan does not permit pausing.');
  if (action === 'RESUME' && !subscription.plan.allowRenewal) throw new AppError(409, 'INVALID_TRANSITION', 'This plan does not permit resuming.');
  if (action === 'CLOSE' && !subscription.plan.allowEarlyClosure) throw new AppError(409, 'INVALID_TRANSITION', 'This plan does not permit early closure.');
  if (action === 'RENEW' && !subscription.plan.allowRenewal) throw new AppError(409, 'INVALID_TRANSITION', 'This plan does not permit renewal.');
  const data = await prisma.$transaction(async (tx) => {
    const nextExpiry = action === 'RENEW' ? (() => {
      const base = subscription.expiryDate ? new Date(subscription.expiryDate) : new Date();
      const count = subscription.plan.billingInterval.count;
      const unit = subscription.plan.billingInterval.unit.toLowerCase();
      if (unit.startsWith('day')) base.setUTCDate(base.getUTCDate() + count);
      else if (unit.startsWith('week')) base.setUTCDate(base.getUTCDate() + (count * 7));
      else if (unit.startsWith('month')) base.setUTCMonth(base.getUTCMonth() + count);
      else if (unit.startsWith('year')) base.setUTCFullYear(base.getUTCFullYear() + count);
      return base;
    })() : undefined;
    const updated = await tx.subscription.update({ where: { id }, data: { status: transition.to, ...(nextExpiry ? { expiryDate: nextExpiry } : {}), pausedEffectiveAt: action === 'PAUSE' ? new Date() : action === 'RESUME' || action === 'RENEW' ? null : undefined, version: { increment: 1 } } });
    await tx.subscriptionStatusLog.create({ data: { subscriptionId: id, status: transition.to, note: action, effectiveAt: new Date() } });
    return updated;
  });
  res.json({ data });
});
