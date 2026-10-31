import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const roles = [['ADMIN', 'Admin'], ['MARKETING', 'Marketing'], ['FINANCE', 'Finance'], ['CUSTOMER', 'Customer']];
const intervals = [['DAILY', 'Daily', 'day'], ['WEEKLY', 'Weekly', 'week'], ['MONTHLY', 'Monthly', 'month'], ['YEARLY', 'Yearly', 'year']];
try {
  for (const [code, name] of roles) await prisma.role.upsert({ where: { code }, update: { name }, create: { code, name } });
  for (const [code, name, unit] of intervals) await prisma.billingInterval.upsert({ where: { code }, update: { name, unit }, create: { code, name, unit } });
  const company = await prisma.companySetting.findFirst();
  if (!company) await prisma.companySetting.create({ data: { legalName: 'Brightloop Software', publicName: 'Brightloop', currency: 'INR', timezone: 'Asia/Kolkata' } });
  const tax = await prisma.tax.findFirst({ where: { name: 'Service tax (project default)' } });
  if (!tax) await prisma.tax.create({ data: { name: 'Service tax (project default)', rate: '18.00', taxExclusive: true } });
} finally { await prisma.$disconnect(); }
