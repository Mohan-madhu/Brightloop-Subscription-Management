import { Router } from 'express';
import { parsePagination } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import { requireActor, requireRoles, ROLE } from '../billing/access.js';
import { assertDateRange, bodyNote, optionalBoolean, optionalDate, optionalText } from '../billing/validation.js';
import { cancelInvoice, confirmInvoice, getInvoice, listInvoices, renderInvoicePrint, sendInvoice } from '../../services/invoices.js';

export const invoicesRouter = Router();
invoicesRouter.use(requireActor);

const STATUSES = ['DRAFT', 'CONFIRMED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'OVERDUE'];

invoicesRouter.get('/', async (req, res) => {
  const { page, pageSize, skip, orderBy } = parsePagination(req.query, {
    allowedSort: ['createdAt', 'dueDate', 'total', 'balance', 'number']
  });
  const status = optionalText(req.query, 'status', 20)?.toUpperCase();
  if (status && !STATUSES.includes(status)) throw new AppError(400, 'VALIDATION_ERROR', `status must be one of ${STATUSES.join(', ')}.`);
  const search = optionalText(req.query, 'search', 100);
  const customerId = optionalText(req.query, 'customerId', 50);
  const dueFrom = optionalDate(req.query, 'dueFrom');
  const dueTo = optionalDate(req.query, 'dueTo');
  assertDateRange(dueFrom, dueTo, 'due date range');
  const createdFrom = optionalDate(req.query, 'createdFrom');
  const createdTo = optionalDate(req.query, 'createdTo');
  assertDateRange(createdFrom, createdTo, 'created date range');
  const overdue = optionalBoolean(req.query, 'overdue');

  const result = await listInvoices({
    actor: req.auth,
    page,
    pageSize,
    skip,
    orderBy: orderBy ?? { createdAt: 'desc' },
    filters: { status, search, customerId, dueFrom, dueTo, createdFrom, createdTo, overdue }
  });
  return res.json(result);
});

invoicesRouter.get('/:id', async (req, res) => {
  const invoice = await getInvoice({ actor: req.auth, invoiceId: req.params.id });
  return res.json({ data: invoice });
});

invoicesRouter.post('/:id/confirm', requireRoles(ROLE.ADMIN, ROLE.FINANCE), async (req, res) => {
  const result = await confirmInvoice({ invoiceId: req.params.id, note: bodyNote(req.body?.note), actor: req.auth });
  return res.json({ data: result.invoice, emailQueued: result.emailQueued, outboxId: result.outboxId });
});

invoicesRouter.post('/:id/send', requireRoles(ROLE.ADMIN, ROLE.FINANCE), async (req, res) => {
  const result = await sendInvoice({ invoiceId: req.params.id, actor: req.auth });
  return res.json({ data: result.data, outboxId: result.outboxId });
});

invoicesRouter.post('/:id/cancel', requireRoles(ROLE.ADMIN, ROLE.FINANCE), async (req, res) => {
  const invoice = await cancelInvoice({ invoiceId: req.params.id, note: bodyNote(req.body?.note), actor: req.auth });
  return res.json({ data: invoice });
});

invoicesRouter.get('/:id/print', async (req, res) => {
  const html = await renderInvoicePrint({ actor: req.auth, invoiceId: req.params.id });
  res.type('html').send(html);
});
