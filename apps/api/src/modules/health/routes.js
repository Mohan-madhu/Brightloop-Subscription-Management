import { Router } from 'express';
import { prisma } from '../../db/prisma.js';

export const healthRouter = Router();
healthRouter.get('/live', (_req, res) => res.json({ data: { status: 'ok' } }));
healthRouter.get('/ready', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ data: { status: 'ready' } }); }
  catch { res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database is unavailable.', details: [] } }); }
});
