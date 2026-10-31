import { Router } from 'express';
import { z } from 'zod';
import { parsePagination } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import { requireActor, requireRoles, ROLE } from '../billing/access.js';
import { assertDateRange, optionalDate, optionalText } from '../billing/validation.js';
import { getDashboard, getDueKanban, getDueKanbanDetail, KANBAN_BUCKETS } from '../../services/reports.js';
import { listQuarterlyRuns, runQuarterlyReport } from '../../services/quarterly-reports.js';

const quarterSchema = z.object({
  periodKey: z.string().regex(/^\d{4}-Q[1-4]$/, 'periodKey must use YYYY-Qn.').optional()
});

export const reportsRouter = Router();
reportsRouter.use(requireActor);

function rangeFromQuery(req) {
  const from = optionalDate(req.query, 'from');
  const to = optionalDate(req.query, 'to');
  assertDateRange(from, to, 'report range');
  return { from, to };
}

reportsRouter.get('/dashboard', async (req, res) => {
  const range = rangeFromQuery(req);
  const dashboard = await getDashboard({ actor: req.auth, ...range });
  return res.json({ data: dashboard });
});

reportsRouter.get('/due-kanban', async (req, res) => {
  const kanban = await getDueKanban({ actor: req.auth });
  return res.json({ data: kanban });
});

reportsRouter.get('/due-kanban/:bucket', async (req, res) => {
  const bucket = optionalText(req.params, 'bucket', 30);
  if (!KANBAN_BUCKETS.some((item) => item.key === bucket)) {
    throw new AppError(400, 'VALIDATION_ERROR', `bucket must be one of ${KANBAN_BUCKETS.map((item) => item.key).join(', ')}.`);
  }
  const { page, pageSize, skip, orderBy } = parsePagination(req.query, {
    allowedSort: ['dueDate', 'balance', 'total', 'createdAt']
  });
  const result = await getDueKanbanDetail({
    actor: req.auth,
    bucket,
    page,
    pageSize,
    skip,
    orderBy: orderBy ?? { dueDate: 'asc' }
  });
  return res.json(result);
});

reportsRouter.get('/quarterly', requireRoles(ROLE.ADMIN, ROLE.FINANCE), async (req, res) => {
  const { page, pageSize, skip } = parsePagination(req.query);
  const result = await listQuarterlyRuns({ page, pageSize, skip });
  return res.json(result);
});

reportsRouter.post('/quarterly/run', requireRoles(ROLE.ADMIN, ROLE.FINANCE), async (req, res) => {
  const body = quarterSchema.parse(req.body ?? {});
  const result = await runQuarterlyReport({ periodKey: body.periodKey, actor: req.auth, trigger: 'manual' });
  const { csv, ...payload } = result;
  return res.json({ data: { ...payload, csvAvailable: Boolean(csv) } });
});
