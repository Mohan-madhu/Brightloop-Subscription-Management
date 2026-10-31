import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../middleware/errors.js';
import { parsePagination } from '../../middleware/validate.js';
import { requireAuth, requireCsrf, requireRole } from '../../middleware/auth.js';

export const catalogRouter = Router();
const money = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a positive decimal string.');
const productInput = z.object({ name: z.string().trim().min(1).max(160), type: z.string().trim().min(1).max(80), salesPrice: money, costPrice: money, notes: z.string().trim().max(4000).nullable().optional(), active: z.boolean().optional() });
const planInput = z.object({ name: z.string().trim().min(1).max(160), billingIntervalId: z.string().cuid(), price: money, minimumQuantity: z.number().int().positive(), availableFrom: z.string().date().nullable().optional(), availableUntil: z.string().date().nullable().optional(), allowEarlyClosure: z.boolean(), allowPause: z.boolean(), allowRenewal: z.boolean(), allowEndDateClosure: z.boolean(), active: z.boolean().optional(), products: z.array(z.object({ productId: z.string().cuid(), variantId: z.string().cuid().nullable().optional(), isAddon: z.boolean(), price: money })).min(1) });
const taxInput = z.object({ name: z.string().trim().min(1).max(160), rate: z.string().regex(/^\d+(\.\d{1,2})?$/), taxExclusive: z.boolean(), active: z.boolean().optional() });
const discountInput = z.object({ code: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()), kind: z.enum(['FIXED', 'PERCENTAGE']), amount: money, minimumPurchase: money.nullable().optional(), minimumQuantity: z.number().int().positive().nullable().optional(), startsAt: z.string().datetime().nullable().optional(), endsAt: z.string().datetime().nullable().optional(), usageLimit: z.number().int().positive().nullable().optional(), active: z.boolean().optional(), targets: z.array(z.object({ productId: z.string().cuid().nullable().optional(), variantId: z.string().cuid().nullable().optional(), planId: z.string().cuid().nullable().optional() })).optional() });

catalogRouter.get('/products', requireAuth, async (req, res) => {
  const page = parsePagination(req.query, { allowedSort: ['name', 'createdAt'] }); const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const where = { ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}) };
  const [data, total] = await prisma.$transaction([prisma.product.findMany({ where, skip: page.skip, take: page.pageSize, orderBy: page.orderBy ?? { name: 'asc' }, include: { variants: { include: { attributes: { include: { attribute: true } } } } } }), prisma.product.count({ where })]);
  res.json({ data, pagination: { page: page.page, pageSize: page.pageSize, total, totalPages: Math.ceil(total / page.pageSize) } });
});

catalogRouter.post('/products', requireAuth, requireCsrf, requireRole('ADMIN'), async (req, res) => res.status(201).json({ data: await prisma.product.create({ data: productInput.parse(req.body) }) }));
catalogRouter.patch('/products/:id', requireAuth, requireCsrf, requireRole('ADMIN'), async (req, res) => {
  const data = productInput.partial().parse(req.body); try { res.json({ data: await prisma.product.update({ where: { id: z.string().cuid().parse(req.params.id) }, data: { ...data, version: { increment: 1 } } }) }); } catch { throw new AppError(404, 'NOT_FOUND', 'Product not found.'); }
});

catalogRouter.post('/products/:id/variants', requireAuth, requireCsrf, requireRole('ADMIN'), async (req, res) => {
  const productId = z.string().cuid().parse(req.params.id); const input = z.object({ sku: z.string().trim().max(100).nullable().optional(), priceAdjustment: money, attributes: z.array(z.object({ name: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(120) })).min(1) }).parse(req.body);
  const data = await prisma.$transaction(async (tx) => { const variant = await tx.productVariant.create({ data: { productId, sku: input.sku ?? null, priceAdjustment: input.priceAdjustment } }); for (const entry of input.attributes) { const attribute = await tx.attribute.upsert({ where: { name: entry.name }, update: {}, create: { name: entry.name } }); await tx.variantAttributeValue.create({ data: { variantId: variant.id, attributeId: attribute.id, value: entry.value } }); } return variant; });
  res.status(201).json({ data });
});

catalogRouter.get('/plans', requireAuth, async (req, res) => res.json({ data: await prisma.plan.findMany({ include: { billingInterval: true, products: { include: { product: true, variant: true } } }, orderBy: { name: 'asc' } }) }));
catalogRouter.post('/plans', requireAuth, requireCsrf, requireRole('ADMIN'), async (req, res) => {
  const input = planInput.parse(req.body); const { products, availableFrom, availableUntil, ...plan } = input;
  const data = await prisma.plan.create({ data: { ...plan, availableFrom: availableFrom ? new Date(availableFrom) : null, availableUntil: availableUntil ? new Date(availableUntil) : null, products: { create: products } }, include: { products: true } }); res.status(201).json({ data });
});
catalogRouter.patch('/plans/:id', requireAuth, requireCsrf, requireRole('ADMIN'), async (req, res) => {
  const input = planInput.partial().parse(req.body); const { products, availableFrom, availableUntil, ...plan } = input; const id = z.string().cuid().parse(req.params.id);
  const data = await prisma.$transaction(async (tx) => { await tx.plan.update({ where: { id }, data: { ...plan, ...(availableFrom !== undefined ? { availableFrom: availableFrom ? new Date(availableFrom) : null } : {}), ...(availableUntil !== undefined ? { availableUntil: availableUntil ? new Date(availableUntil) : null } : {}), version: { increment: 1 } } }); if (products) { await tx.planProduct.deleteMany({ where: { planId: id } }); await tx.planProduct.createMany({ data: products.map((item) => ({ ...item, planId: id, variantId: item.variantId ?? null })) }); } return tx.plan.findUniqueOrThrow({ where: { id }, include: { products: true } }); }); res.json({ data });
});

catalogRouter.get('/taxes', requireAuth, async (_req, res) => res.json({ data: await prisma.tax.findMany({ orderBy: { name: 'asc' } }) }));
catalogRouter.post('/taxes', requireAuth, requireCsrf, requireRole('ADMIN'), async (req, res) => res.status(201).json({ data: await prisma.tax.create({ data: taxInput.parse(req.body) }) }));
catalogRouter.patch('/taxes/:id', requireAuth, requireCsrf, requireRole('ADMIN'), async (req, res) => { try { res.json({ data: await prisma.tax.update({ where: { id: z.string().cuid().parse(req.params.id) }, data: taxInput.partial().parse(req.body) }) }); } catch { throw new AppError(404, 'NOT_FOUND', 'Tax rule not found.'); } });
catalogRouter.get('/discounts', requireAuth, requireRole('ADMIN'), async (_req, res) => res.json({ data: await prisma.discount.findMany({ include: { targets: true }, orderBy: { code: 'asc' } }) }));
catalogRouter.post('/discounts', requireAuth, requireCsrf, requireRole('ADMIN'), async (req, res) => { const input = discountInput.parse(req.body); const { targets, startsAt, endsAt, ...discount } = input; const data = await prisma.discount.create({ data: { ...discount, startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null, targets: targets ? { create: targets.map((target) => ({ productId: target.productId ?? null, variantId: target.variantId ?? null, planId: target.planId ?? null })) } : undefined }, include: { targets: true } }); res.status(201).json({ data }); });
catalogRouter.patch('/discounts/:id', requireAuth, requireCsrf, requireRole('ADMIN'), async (req, res) => { const input = discountInput.partial().parse(req.body); const { targets, startsAt, endsAt, ...discount } = input; const id = z.string().cuid().parse(req.params.id); const data = await prisma.$transaction(async (tx) => { await tx.discount.update({ where: { id }, data: { ...discount, ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}), ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}) } }); if (targets) { await tx.discountTarget.deleteMany({ where: { discountId: id } }); await tx.discountTarget.createMany({ data: targets.map((target) => ({ discountId: id, productId: target.productId ?? null, variantId: target.variantId ?? null, planId: target.planId ?? null })) }); } return tx.discount.findUniqueOrThrow({ where: { id }, include: { targets: true } }); }); res.json({ data }); });
