import { Router } from 'express';
import { z } from 'zod';
import { parsePagination } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import { requireActor, requireRoles, ROLE } from '../billing/access.js';
import { assertDateRange, optionalDate, optionalText } from '../billing/validation.js';
import { listPayments, recordManualPayment, MANUAL_PAYMENT_METHODS } from '../../services/payments.js';
import { createRazorpayOrder, verifyRazorpayPayment } from '../../services/razorpay.js';

const manualPaymentSchema = z.object({
  method: z.string().trim().min(1).max(30),
  amount: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/, 'amount must be a decimal string with at most two fraction digits.'),
  paidAt: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), 'paidAt must be a valid date or timestamp.'),
  note: z.string().max(500).optional().nullable()
});

const verifySchema = z.object({
  paymentId: z.string().trim().min(1).max(100),
  orderId: z.string().trim().min(1).max(100)
});

export const invoicePaymentsRouter = Router();
invoicePaymentsRouter.use(requireActor);

invoicePaymentsRouter.post('/:id/payments', requireRoles(ROLE.ADMIN, ROLE.FINANCE), async (req, res) => {
  const body = manualPaymentSchema.parse(req.body ?? {});
  if (Number(body.amount) <= 0) throw new AppError(400, 'VALIDATION_ERROR', 'amount must be greater than zero.');
  const result = await recordManualPayment({
    invoiceId: req.params.id,
    method: body.method,
    amount: body.amount,
    paidAt: new Date(body.paidAt),
    note: body.note ?? null,
    actor: req.auth
  });
  return res.status(201).json(result);
});

invoicePaymentsRouter.post('/:id/razorpay/order', async (req, res) => {
  const result = await createRazorpayOrder({ invoiceId: req.params.id, actor: req.auth });
  return res.status(201).json(result);
});

export const paymentsRouter = Router();
paymentsRouter.use(requireActor);

paymentsRouter.get('/', async (req, res) => {
  const { page, pageSize, skip, orderBy } = parsePagination(req.query, {
    allowedSort: ['paidAt', 'createdAt', 'amount']
  });
  const status = optionalText(req.query, 'status', 20)?.toUpperCase();
  if (status && !['PENDING', 'CONFIRMED', 'FAILED', 'VOID'].includes(status)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'status must be one of PENDING, CONFIRMED, FAILED, VOID.');
  }
  const method = optionalText(req.query, 'method', 30)?.toUpperCase();
  if (method && !MANUAL_PAYMENT_METHODS.includes(method) && !method.startsWith('RAZORPAY_')) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Unsupported payment method filter.');
  }
  const invoiceId = optionalText(req.query, 'invoiceId', 50);
  const providerPaymentId = optionalText(req.query, 'providerPaymentId', 100);
  const search = optionalText(req.query, 'search', 100);
  const paidFrom = optionalDate(req.query, 'paidFrom');
  const paidTo = optionalDate(req.query, 'paidTo');
  assertDateRange(paidFrom, paidTo, 'paid date range');

  const result = await listPayments({
    actor: req.auth,
    page,
    pageSize,
    skip,
    orderBy: orderBy ?? { paidAt: 'desc' },
    filters: { status, method, invoiceId, providerPaymentId, search, paidFrom, paidTo }
  });
  return res.json(result);
});

paymentsRouter.post('/razorpay/verify', async (req, res) => {
  const body = verifySchema.parse(req.body ?? {});
  const result = await verifyRazorpayPayment({ actor: req.auth, paymentId: body.paymentId, orderId: body.orderId });
  return res.json({ data: result.result, duplicate: result.duplicate });
});
