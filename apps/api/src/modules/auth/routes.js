import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { validate as validateEmail } from 'deep-email-validator';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../middleware/errors.js';
import { requireAuth, requireCsrf } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { hashToken, newToken, sessionExpiry } from '../../utils/session.js';
import { queueEmail } from '../../services/email.js';
import { env } from '../../config/env.js';

export const authRouter = Router();
const loginSchema = z.object({ email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()), password: z.string().min(1).max(1024) });
const signupSchema = z.object({ email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()), firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().max(100).optional(), password: z.string().min(9).max(1024).regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])/, 'Password must include uppercase, lowercase and special characters.') });
const tokenSchema = z.object({ token: z.string().min(20).max(200) });

async function advisoryEmailCheck(email) {
  await Promise.race([validateEmail({ email, validateSMTP: false }), new Promise((resolve) => setTimeout(resolve, 2000))]);
}
async function createAuthToken(tx, userId, purpose) {
  const raw = newToken(); const expiresAt = new Date(Date.now() + (purpose === 'ACTIVATION' ? 24 : 1) * 60 * 60 * 1000);
  const token = await tx.authToken.create({ data: { userId, purpose, tokenHash: hashToken(raw), expiresAt } });
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, firstName: true } });
  const activation = purpose === 'ACTIVATION';
  await queueEmail({ to: user.email, subject: activation ? 'Activate your Brightloop account' : 'Reset your Brightloop password', template: activation ? 'activation' : 'password_reset', data: { firstName: user.firstName, expiresAt: expiresAt.toISOString(), ...(activation ? { activationUrl: `${env.APP_BASE_URL}/activate?token=${encodeURIComponent(raw)}` } : { resetUrl: `${env.APP_BASE_URL}/password-reset?token=${encodeURIComponent(raw)}` }) } }, tx);
  return token;
}

authRouter.post('/signup', rateLimit({ prefix: 'signup', limit: 5, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  const data = signupSchema.parse(req.body); void advisoryEmailCheck(data.email);
  const customerRole = await prisma.role.findUnique({ where: { code: 'CUSTOMER' } });
  if (!customerRole) throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Account setup is not available.');
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'CONFLICT', 'An account already exists for this email.');
  const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: data.email, firstName: data.firstName, lastName: data.lastName, kind: 'CUSTOMER', credential: { create: { passwordHash } }, roles: { create: { roleId: customerRole.id } }, customer: { create: { legalName: [data.firstName, data.lastName].filter(Boolean).join(' '), billingEmail: data.email } } } });
    await createAuthToken(tx, user.id, 'ACTIVATION');
  });
  return res.status(201).json({ data: { accepted: true } });
});

authRouter.post('/activate', rateLimit({ prefix: 'activate', limit: 10, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  const { token } = tokenSchema.parse(req.body); const tokenHash = hashToken(token);
  const record = await prisma.authToken.findUnique({ where: { tokenHash } });
  if (!record || record.purpose !== 'ACTIVATION' || record.usedAt || record.expiresAt <= new Date()) throw new AppError(400, 'INVALID_TOKEN', 'Activation token is invalid or expired.');
  await prisma.$transaction([prisma.user.update({ where: { id: record.userId }, data: { isActive: true } }), prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })]);
  return res.json({ data: { activated: true } });
});

authRouter.post('/password-reset/request', rateLimit({ prefix: 'reset', limit: 5, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  const { email } = z.object({ email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.isActive) await prisma.$transaction((tx) => createAuthToken(tx, user.id, 'PASSWORD_RESET'));
  return res.json({ data: { accepted: true } });
});

authRouter.post('/password-reset/confirm', rateLimit({ prefix: 'reset-confirm', limit: 10, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  const { token, password } = tokenSchema.extend({ password: signupSchema.shape.password }).parse(req.body); const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.purpose !== 'PASSWORD_RESET' || record.usedAt || record.expiresAt <= new Date()) throw new AppError(400, 'INVALID_TOKEN', 'Reset token is invalid or expired.');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.$transaction([prisma.authCredential.update({ where: { userId: record.userId }, data: { passwordHash } }), prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }), prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } })]);
  return res.json({ data: { passwordReset: true } });
});

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
