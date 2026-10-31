import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../middleware/errors.js';
import { parsePagination } from '../../middleware/validate.js';
import { requireAuth, requireCsrf, requireCustomerAccess, requireRole } from '../../middleware/auth.js';

export const customerRouter = Router();
customerRouter.get('/', requireAuth, async (req, res) => {
  const page = parsePagination(req.query, { allowedSort: ['legalName', 'createdAt'] }); const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const visible = req.auth.roles.includes('ADMIN') || req.auth.roles.includes('FINANCE') ? {} : req.auth.roles.includes('MARKETING') ? { assignments: { some: { userId: req.auth.userId } } } : { id: req.auth.customerId ?? '__none__' };
  const where = { AND: [visible, ...(search ? [{ legalName: { contains: search, mode: 'insensitive' } }] : [])] };
  const [data, total] = await prisma.$transaction([prisma.customer.findMany({ where, skip: page.skip, take: page.pageSize, orderBy: page.orderBy ?? { legalName: 'asc' }, include: { user: { select: { email: true, firstName: true, lastName: true } } } }), prisma.customer.count({ where })]);
  res.json({ data, pagination: { page: page.page, pageSize: page.pageSize, total, totalPages: Math.ceil(total / page.pageSize) } });
});
customerRouter.get('/:id', requireAuth, requireCustomerAccess, async (req, res) => { const data = await prisma.customer.findUnique({ where: { id: req.params.id }, include: { user: { select: { email: true, firstName: true, lastName: true } }, assignments: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } } } }); if (!data) throw new AppError(404, 'NOT_FOUND', 'Customer not found.'); res.json({ data }); });
customerRouter.post('/:id/assignments', requireAuth, requireCsrf, requireRole('ADMIN'), async (req, res) => { const customerId = z.string().cuid().parse(req.params.id); const userId = z.object({ userId: z.string().cuid() }).parse(req.body).userId; const user = await prisma.user.findUnique({ where: { id: userId } }); if (!user || user.kind !== 'STAFF') throw new AppError(400, 'VALIDATION_ERROR', 'Assignments require a staff user.'); const data = await prisma.customerAssignment.upsert({ where: { customerId_userId: { customerId, userId } }, update: {}, create: { customerId, userId } }); res.status(201).json({ data }); });
customerRouter.delete('/:id/assignments/:userId', requireAuth, requireCsrf, requireRole('ADMIN'), async (req, res) => { await prisma.customerAssignment.delete({ where: { customerId_userId: { customerId: z.string().cuid().parse(req.params.id), userId: z.string().cuid().parse(req.params.userId) } } }); res.json({ data: { removed: true } }); });
