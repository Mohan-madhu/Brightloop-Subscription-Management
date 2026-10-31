import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../middleware/errors.js';
import { requireAuth, requireCsrf } from '../../middleware/auth.js';
import { hashToken, newToken, sessionExpiry } from '../../utils/session.js';

export const authRouter = Router();
const loginSchema = z.object({ email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()), password: z.string().min(1).max(1024) });

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email }, include: { credential: true, roles: { include: { role: true } }, customer: { select: { id: true } } } });
  if (!user?.credential || !user.isActive || !(await argon2.verify(user.credential.passwordHash, password))) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  const token = newToken(); const csrfToken = newToken();
  await prisma.session.create({ data: { userId: user.id, tokenHash: hashToken(token), csrfTokenHash: hashToken(csrfToken), expiresAt: sessionExpiry() } });
  const secure = process.env.NODE_ENV === 'production';
  res.cookie('bl_session', token, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 8 * 60 * 60 * 1000 });
  res.cookie('bl_csrf', csrfToken, { httpOnly: false, sameSite: 'lax', secure, path: '/', maxAge: 8 * 60 * 60 * 1000 });
  return res.json({ data: { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, kind: user.kind, roles: user.roles.map(({ role }) => role.code), customerId: user.customer?.id ?? null } } });
});

authRouter.get('/me', requireAuth, async (req, res) => res.json({ data: req.auth }));
authRouter.post('/logout', requireAuth, requireCsrf, async (req, res) => {
  await prisma.session.update({ where: { id: req.auth.sessionId }, data: { revokedAt: new Date() } });
  res.clearCookie('bl_session', { path: '/' }); res.clearCookie('bl_csrf', { path: '/' });
  return res.json({ data: { loggedOut: true } });
});
