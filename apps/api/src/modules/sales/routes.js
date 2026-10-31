import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../middleware/errors.js';
import { requireAuth, requireCsrf } from '../../middleware/auth.js';

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
salesRouter.post('/subscriptions/:id/actions', requireAuth, requireCsrf, async (req, res) => {
  const id = z.string().cuid().parse(req.params.id); const { action } = z.object({ action: z.enum(['ACTIVATE', 'PAUSE', 'RESUME', 'CLOSE']) }).parse(req.body);
  const subscription = await prisma.subscription.findUnique({ where: { id }, include: { plan: true } });
  if (!subscription) throw new AppError(404, 'NOT_FOUND', 'Subscription not found.');
  if (!(await canAccessCustomer(req.auth, subscription.customerId))) throw new AppError(403, 'FORBIDDEN', 'You do not have access to this subscription.');
  const transitions = { ACTIVATE: { from: ['CONFIRMED'], to: 'ACTIVE' }, PAUSE: { from: ['ACTIVE'], to: 'PAUSED' }, RESUME: { from: ['PAUSED'], to: 'ACTIVE' }, CLOSE: { from: ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED'], to: 'CLOSED' } };
  const transition = transitions[action];
  if (!transition.from.includes(subscription.status)) throw new AppError(409, 'INVALID_TRANSITION', 'This lifecycle action is not allowed from the current status.');
  if (action === 'PAUSE' && !subscription.plan.allowPause) throw new AppError(409, 'INVALID_TRANSITION', 'This plan does not permit pausing.');
  if (action === 'RESUME' && !subscription.plan.allowRenewal) throw new AppError(409, 'INVALID_TRANSITION', 'This plan does not permit resuming.');
  if (action === 'CLOSE' && !subscription.plan.allowEarlyClosure) throw new AppError(409, 'INVALID_TRANSITION', 'This plan does not permit early closure.');
  const data = await prisma.$transaction(async (tx) => { const updated = await tx.subscription.update({ where: { id }, data: { status: transition.to, pausedEffectiveAt: action === 'PAUSE' ? new Date() : action === 'RESUME' ? null : undefined, version: { increment: 1 } } }); await tx.subscriptionStatusLog.create({ data: { subscriptionId: id, status: transition.to, note: action, effectiveAt: new Date() } }); return updated; });
  res.json({ data });
});
