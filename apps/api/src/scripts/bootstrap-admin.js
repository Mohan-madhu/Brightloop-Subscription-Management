import argon2 from 'argon2';
import { prisma } from '../db/prisma.js';

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!email || !password) throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD.');
if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/.test(password)) throw new Error('Password must be 9+ characters with uppercase, lowercase and special characters.');
const role = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
if (!role) throw new Error('Run the explicit seed command before bootstrapping an administrator.');
const existing = await prisma.user.findUnique({ where: { email } });
if (existing) throw new Error('A user already exists with that email.');
const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
await prisma.user.create({ data: { email, firstName: 'Administrator', kind: 'STAFF', isActive: true, credential: { create: { passwordHash } }, roles: { create: { roleId: role.id } } } });
await prisma.$disconnect();
