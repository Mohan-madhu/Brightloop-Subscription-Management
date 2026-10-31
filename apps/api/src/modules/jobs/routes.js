import { Router } from 'express';
import { z } from 'zod';
import { requireActor, requireRoles, ROLE } from '../billing/access.js';
import { bodyNote, dateString } from '../billing/validation.js';
import { runDueBilling } from '../../services/billing.js';
import { processEmailOutbox } from '../../services/email.js';
import { AppError } from '../../middleware/errors.js';

const billingRunSchema = z.object({
  asOf: dateString.optional(),
  subscriptionId: z.string().trim().min(1).max(50).optional(),
  note: z.string().max(500).optional()
});

const emailRunSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional()
});

export const jobsRouter = Router();
jobsRouter.use(requireActor);

jobsRouter.post('/billing/run', requireRoles(ROLE.ADMIN), async (req, res) => {
  const body = billingRunSchema.parse(req.body ?? {});
  const result = await runDueBilling({
    ...(body.asOf ? { asOf: body.asOf } : {}),
    ...(body.subscriptionId ? { subscriptionId: body.subscriptionId } : {})
  });
  return res.json({ data: { ...result, note: bodyNote(body.note) } });
});

jobsRouter.post('/email/run', requireRoles(ROLE.ADMIN), async (req, res) => {
  const body = emailRunSchema.parse(req.body ?? {});
  if (process.env.EMAIL_DELIVERY_ENABLED !== 'true') {
    throw new AppError(409, 'EMAIL_DELIVERY_DISABLED', 'EMAIL_DELIVERY_ENABLED is false; no email was claimed or sent.');
  }
  const result = await processEmailOutbox({ limit: body.limit ?? 10 });
  return res.json({ data: result });
});

jobsRouter.get('/status', requireRoles(ROLE.ADMIN), async (_req, res) => {
  return res.json({
    data: {
      jobsEnabled: process.env.JOBS_ENABLED === 'true',
      emailDeliveryEnabled: process.env.EMAIL_DELIVERY_ENABLED === 'true',
      billingIntervalMs: Number(process.env.BILLING_JOB_INTERVAL_MS ?? 900000),
      emailIntervalMs: Number(process.env.EMAIL_JOB_INTERVAL_MS ?? 60000)
    }
  });
});
