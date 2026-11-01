import { Router } from 'express';
import { parsePagination } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import { requireActor, requireRoles, ROLE } from '../billing/access.js';
import { assertDateRange, assertValidId, bodyNote, optionalBoolean, optionalDate, optionalText } from '../billing/validation.js';
import { cancelInvoice, confirmInvoice, getInvoice, listInvoices, renderInvoicePrint, sendInvoice } from '../../services/invoices.js';

export const invoicesRouter = Router();
// Defensive security check: enforce valid authentication and roles before proceeding
invoicesRouter.use(requireActor);

const STATUSES = ['DRAFT', 'CONFIRMED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'OVERDUE'];

// GET /invoices: Paginated invoice listing with multi-tenant ownership scoping
invoicesRouter.get('/', async (req, res) => {
  const { page, pageSize, skip, orderBy } = parsePagination(req.query, {
    allowedSort: ['createdAt', 'dueDate', 'total', 'balance', 'number']
  });
  const status = optionalText(req.query, 'status', 20)?.toUpperCase();
  if (status && !STATUSES.includes(status)) throw new AppError(400, 'VALIDATION_ERROR', `status must be one of ${STATUSES.join(', ')}.`);
  const search = optionalText(req.query, 'search', 100);
  const customerId = optionalText(req.query, 'customerId', 50);
  if (customerId) assertValidId(customerId, 'customerId');
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

// GET /invoices/:id: Scoped invoice detail fetch
invoicesRouter.get('/:id', async (req, res) => {
  const invoiceId = assertValidId(req.params.id, 'invoiceId');
  const invoice = await getInvoice({ actor: req.auth, invoiceId });
  return res.json({ data: invoice });
});

// POST /invoices/:id/confirm: Transition DRAFT to CONFIRMED, consume discount reservation, queue email
invoicesRouter.post('/:id/confirm', requireRoles(ROLE.ADMIN, ROLE.FINANCE), async (req, res) => {
  const invoiceId = assertValidId(req.params.id, 'invoiceId');
  const result = await confirmInvoice({ invoiceId, note: bodyNote(req.body?.note), actor: req.auth });
  return res.json({ data: result.invoice, emailQueued: result.emailQueued, outboxId: result.outboxId });
});

// POST /invoices/:id/send: Queue invoice email dispatch
invoicesRouter.post('/:id/send', requireRoles(ROLE.ADMIN, ROLE.FINANCE), async (req, res) => {
  const invoiceId = assertValidId(req.params.id, 'invoiceId');
  const result = await sendInvoice({ invoiceId, actor: req.auth });
  return res.json({ data: result.data, outboxId: result.outboxId });
});

// POST /invoices/:id/cancel: Restrict cancellation if payments exist, release discount reservations
invoicesRouter.post('/:id/cancel', requireRoles(ROLE.ADMIN, ROLE.FINANCE), async (req, res) => {
  const invoiceId = assertValidId(req.params.id, 'invoiceId');
  const invoice = await cancelInvoice({ invoiceId, note: bodyNote(req.body?.note), actor: req.auth });
  return res.json({ data: invoice });
});

// GET /invoices/:id/print: Render sanitized HTML print view with CSS media queries
invoicesRouter.get('/:id/print', async (req, res) => {
  const invoiceId = assertValidId(req.params.id, 'invoiceId');
  const html = await renderInvoicePrint({ actor: req.auth, invoiceId });
  res.type('html').send(html);
});
