import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { parsePagination } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';

export const publicRouter = Router();
publicRouter.get('/company', async (_req, res) => {
  const company = await prisma.companySetting.findFirst({ select: { publicName: true, legalName: true, supportEmail: true, address: true, currency: true, timezone: true } });
  if (!company) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Company information is not configured.', details: [] } });
  return res.json({ data: company });
});
publicRouter.get('/billing-intervals', async (req, res) => {
  const { page, pageSize, skip, orderBy } = parsePagination(req.query, { allowedSort: ['name', 'code'] });
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (typeof req.query.search !== 'undefined' && (search.length > 100 || Array.isArray(req.query.search))) throw new AppError(400, 'VALIDATION_ERROR', 'search must be a string of at most 100 characters.');
  const where = { active: true, ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } : {}) };
  const [data, total] = await prisma.$transaction([prisma.billingInterval.findMany({ where, skip, take: pageSize, orderBy: orderBy ?? { name: 'asc' }, select: { code: true, name: true, unit: true, count: true } }), prisma.billingInterval.count({ where })]);
  return res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
});
publicRouter.get('/plans', async (req, res) => {
  const { page, pageSize, skip, orderBy } = parsePagination(req.query, { allowedSort: ['name', 'price', 'createdAt'] });
  const where = { active: true, billingInterval: { active: true } };
  const [plans, total] = await prisma.$transaction([
    prisma.plan.findMany({ where, skip, take: pageSize, orderBy: orderBy ?? { createdAt: 'asc' }, include: { billingInterval: { select: { code: true, name: true, unit: true, count: true } }, products: { where: { isAddon: false }, take: 1, include: { product: { select: { name: true } } } } } }),
    prisma.plan.count({ where }),
  ]);
  const data = plans.map((plan) => ({ id: plan.id, name: plan.name, price: plan.price, billingInterval: plan.billingInterval, productName: plan.products[0]?.product.name ?? null }));
  return res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
});
