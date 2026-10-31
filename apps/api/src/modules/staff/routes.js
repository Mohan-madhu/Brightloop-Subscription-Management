import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../middleware/errors.js';
import { requireAuth, requireCsrf, requireRole } from '../../middleware/auth.js';
import { hashToken, newToken } from '../../utils/session.js';
import { queueEmail } from '../../services/email.js';
import { env } from '../../config/env.js';
import { parsePagination } from '../../middleware/validate.js';

export const staffRouter = Router();
const password = z.string().min(9).max(1024).regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])/, 'Password must include uppercase, lowercase and special characters.');
const inputSchema = z.object({ email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()), firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().max(100).optional(), password, roles: z.array(z.enum(['MARKETING', 'FINANCE'])).min(1) });

staffRouter.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { page, pageSize, skip, orderBy } = parsePagination(req.query, { allowedSort: ['email', 'createdAt', 'firstName'] });
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const where = { kind: 'STAFF', ...(search ? { OR: [{ email: { contains: search, mode: 'insensitive' } }, { firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }] } : {}) };
  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({ where, skip, take: pageSize, orderBy: orderBy ?? { createdAt: 'desc' }, select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true, roles: { select: { role: { select: { code: true, name: true } } } } } }),
    prisma.user.count({ where })
  ]);
  res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
});

staffRouter.patch('/:id', requireAuth, requireCsrf, requireRole('ADMIN'), async (req, res) => {
  const id = z.string().cuid().parse(req.params.id);
  const input = z.object({ firstName: z.string().trim().min(1).max(100).optional(), lastName: z.string().trim().max(100).nullable().optional(), isActive: z.boolean().optional(), roles: z.array(z.enum(['MARKETING', 'FINANCE'])).min(1).optional() }).parse(req.body);
  if (Object.keys(input).length === 0) throw new AppError(400, 'VALIDATION_ERROR', 'At least one staff field is required.');
  const data = await prisma.$transaction(async (tx) => {
    const staff = await tx.user.findUnique({ where: { id } });
    if (!staff || staff.kind !== 'STAFF') throw new AppError(404, 'NOT_FOUND', 'Staff user not found.');
    const { roles, ...userData } = input;
    await tx.user.update({ where: { id }, data: userData });
    if (roles) {
      const roleRows = await tx.role.findMany({ where: { code: { in: roles } } });
      if (roleRows.length !== roles.length) throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Required staff roles are not configured.');
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({ data: roleRows.map((role) => ({ userId: id, roleId: role.id })) });
    }
    return tx.user.findUniqueOrThrow({ where: { id }, select: { id: true, email: true, firstName: true, lastName: true, isActive: true, roles: { select: { role: { select: { code: true, name: true } } } } } });
  });
  res.json({ data });
});

staffRouter.post('/', requireAuth, requireCsrf, requireRole('ADMIN'), async (req, res) => {
  const input = inputSchema.parse(req.body);
  if (await prisma.user.findUnique({ where: { email: input.email } })) throw new AppError(409, 'CONFLICT', 'An account already exists for this email.');
  const roles = await prisma.role.findMany({ where: { code: { in: input.roles } } });
  if (roles.length !== input.roles.length) throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Required staff roles are not configured.');
  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id }); const rawToken = newToken(); const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const data = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: input.email, firstName: input.firstName, lastName: input.lastName, kind: 'STAFF', credential: { create: { passwordHash } }, roles: { create: roles.map((role) => ({ roleId: role.id })) } }, select: { id: true, email: true, firstName: true, lastName: true, kind: true } });
    const token = await tx.authToken.create({ data: { userId: user.id, purpose: 'ACTIVATION', tokenHash: hashToken(rawToken), expiresAt } });
    await queueEmail({ to: user.email, subject: 'Activate your Brightloop staff account', template: 'activation', data: { firstName: user.firstName, activationUrl: `${env.APP_BASE_URL}/activate?token=${encodeURIComponent(rawToken)}`, expiresAt: expiresAt.toISOString(), tokenId: token.id } }, tx);
    return user;
  });
  res.status(201).json({ data });
});
