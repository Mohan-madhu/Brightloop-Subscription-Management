import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../middleware/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { createAccessToken } from '../../utils/access-token.js';

export const authRouter = Router();
const loginSchema = z.object({ email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()), password: z.string().min(1).max(1024) });

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email }, include: { credential: true, roles: { include: { role: true } }, customer: { select: { id: true } } } });
  if (!user?.credential || !user.isActive || !(await argon2.verify(user.credential.passwordHash, password))) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  return res.json({ data: { accessToken: createAccessToken(user.id), user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, kind: user.kind, roles: user.roles.map(({ role }) => role.code), customerId: user.customer?.id ?? null } } });
});

authRouter.get('/me', requireAuth, async (req, res) => res.json({ data: req.auth }));
