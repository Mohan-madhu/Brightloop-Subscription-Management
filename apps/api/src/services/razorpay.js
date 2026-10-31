import { createHash } from 'node:crypto';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errors.js';
import { dec, moneyString, roundMoney } from './money.js';
import { invoiceScopeWhere } from '../modules/billing/access.js';
import { verifyRazorpaySignature } from './razorpay-signature.js';

const RAZORPAY_BASE = 'https://api.razorpay.com/v1';
const PROVIDER = 'RAZORPAY';

function config() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new AppError(503, 'PAYMENT_PROVIDER_NOT_CONFIGURED', 'Razorpay is not configured on this server.');
  return { keyId, keySecret };
}

async function razorpayRequest(path, { method = 'GET', body = null } = {}) {
  const { keyId, keySecret } = config();
  let response;
  try {
    response = await fetch(`${RAZORPAY_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    throw new AppError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', `Razorpay request failed: ${error.name === 'TimeoutError' ? 'request timed out' : 'network error'}.`);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const description = payload?.error?.description ?? `HTTP ${response.status}`;
    throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', `Razorpay rejected the request: ${description}`);
  }
  return payload;
}

function paiseFor(amount) {
  return Number(roundMoney(amount).mul(100).toFixed(0));
}

export async function createRazorpayOrder({ invoiceId, actor }) {
  const scope = await invoiceScopeWhere(actor);
  const invoice = await prisma.invoice.findFirst({
    where: { AND: [{ id: invoiceId }, scope] },
    include: { orders: true, billingPeriod: { include: { subscription: { select: { number: true } } } } }
  });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice was not found.');
  if (invoice.currency !== 'INR') throw new AppError(409, 'UNSUPPORTED_CURRENCY', 'Only INR invoices are supported.');
  if (!['CONFIRMED', 'SENT', 'PARTIALLY_PAID'].includes(invoice.status)) {
    throw new AppError(409, 'INVALID_STATUS', `A Razorpay order can only be created for an issued invoice; this invoice is ${invoice.status}.`);
  }
  const balance = roundMoney(invoice.balance);
  if (balance.lte(0)) throw new AppError(409, 'NOTHING_OUTSTANDING', 'This invoice has no outstanding balance.');
  const expectedPaise = paiseFor(balance);

  const order = await razorpayRequest('/orders', {
    method: 'POST',
    body: {
      amount: expectedPaise,
      currency: 'INR',
      receipt: invoice.number,
      notes: { invoiceId: invoice.id, invoiceNumber: invoice.number, createdBy: actor?.userId ?? 'staff' }
    }
  });
  if (order?.amount !== expectedPaise || order?.currency !== 'INR') {
    throw new AppError(502, 'PAYMENT_PROVIDER_MISMATCH', 'Razorpay returned an order with an unexpected amount or currency.');
  }

  const stored = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`SELECT id, status, balance FROM "Invoice" WHERE id = ${invoice.id} FOR UPDATE`;
    if (rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Invoice was not found.');
    const current = await tx.invoice.findUnique({ where: { id: invoice.id }, include: { orders: true } });
    if (current.currency !== 'INR' || !['CONFIRMED', 'SENT', 'PARTIALLY_PAID'].includes(current.status)) {
      throw new AppError(409, 'INVALID_STATUS', 'The invoice is no longer payable.');
    }
    if (!roundMoney(current.balance).eq(balance)) {
      throw new AppError(409, 'BALANCE_CHANGED', 'The invoice balance changed while creating the payment order; request a new order.');
    }
    return tx.providerOrder.create({
      data: {
        invoiceId: current.id,
        provider: PROVIDER,
        providerOrderId: order.id,
        amount: moneyString(balance),
        currency: 'INR'
      }
    });
  });

  const { keyId } = config();
  return {
    data: {
      provider: PROVIDER,
      keyId,
      orderId: stored.providerOrderId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      amount: moneyString(balance),
      amountPaise: expectedPaise,
      currency: 'INR'
    }
  };
}

async function lockInvoice(tx, invoiceId) {
  await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} FOR UPDATE`;
  return tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true, orders: true, customer: { select: { legalName: true } } }
  });
}

async function applyCapturedPayment(tx, { order, entity, source }) {
  if (order.provider !== PROVIDER) throw new AppError(409, 'PAYMENT_PROVIDER_MISMATCH', 'Provider order does not belong to Razorpay.');
  if (String(entity.order_id) !== order.providerOrderId) {
    throw new AppError(409, 'PAYMENT_ORDER_MISMATCH', 'Payment order does not match the stored provider order.');
  }
  if (entity.status !== 'captured') throw new AppError(409, 'PAYMENT_NOT_CAPTURED', 'Razorpay has not captured this payment.');
  if (entity.currency !== 'INR' || String(entity.currency) !== order.currency) {
    throw new AppError(409, 'PAYMENT_CURRENCY_MISMATCH', 'Payment currency does not match the invoice currency.');
  }
  const amount = roundMoney(dec(entity.amount).div(100));
  if (!amount.eq(roundMoney(order.amount))) {
    throw new AppError(409, 'PAYMENT_AMOUNT_MISMATCH', 'Payment amount does not match the provider order amount.');
  }

  const invoice = await lockInvoice(tx, order.invoiceId);
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice for this payment was not found.');
  if (invoice.status === 'CANCELLED') throw new AppError(409, 'INVALID_STATUS', 'A cancelled invoice cannot receive payments.');

  const existing = await tx.payment.findUnique({ where: { providerPaymentId: String(entity.id) } });
  if (existing?.status === 'CONFIRMED') {
    return { applied: false, duplicate: true, paymentId: existing.id, invoiceId: invoice.id };
  }

  const balance = roundMoney(invoice.balance);
  if (amount.gt(balance)) {
    throw new AppError(409, 'PAYMENT_EXCEEDS_BALANCE', 'Captured amount exceeds the outstanding invoice balance; manual reconciliation is required.');
  }

  const paidAt = entity.created_at ? new Date(Number(entity.created_at) * 1000) : new Date();
  let payment;
  if (existing) {
    payment = await tx.payment.update({
      where: { id: existing.id },
      data: { status: 'CONFIRMED', amount: moneyString(amount), paidAt, note: `Verified by ${source}.` }
    });
    await tx.paymentStatusLog.create({ data: { paymentId: existing.id, status: 'CONFIRMED', note: `Verified by ${source}.` } });
  } else {
    payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        method: `RAZORPAY_${String(entity.method ?? 'UNKNOWN').toUpperCase()}`,
        amount: moneyString(amount),
        paidAt,
        note: `Verified by ${source}.`,
        providerPaymentId: String(entity.id),
        status: 'CONFIRMED',
        logs: { create: { status: 'CONFIRMED', note: `Verified by ${source}.` } }
      }
    });
  }

  const newBalance = roundMoney(balance.minus(amount));
  const newStatus = newBalance.eq(0) ? 'PAID' : 'PARTIALLY_PAID';
  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      balance: moneyString(newBalance),
      status: newStatus,
      logs: {
        create: {
          status: newStatus,
          note: `Razorpay payment ${String(entity.id)} confirmed for INR ${moneyString(amount)}.`
        }
      }
    }
  });
  return { applied: true, duplicate: false, paymentId: payment.id, invoiceId: invoice.id, status: newStatus, balance: moneyString(newBalance) };
}

async function processPaymentEvent(tx, event, eventName) {
  const entity = event?.payload?.payment?.entity;
  if (!entity?.order_id) return { processed: false, reason: 'NO_ORDER_REFERENCE' };
  const order = await tx.providerOrder.findUnique({ where: { providerOrderId: String(entity.order_id) } });
  if (!order) return { processed: false, reason: 'ORDER_NOT_FOUND' };

  if (eventName === 'payment.failed') {
    const existing = await tx.payment.findUnique({ where: { providerPaymentId: String(entity.id) } });
    if (existing?.status === 'CONFIRMED') return { processed: true, reason: 'PAYMENT_ALREADY_CONFIRMED' };
    if (!existing) {
      await tx.payment.create({
        data: {
          invoiceId: order.invoiceId,
          method: `RAZORPAY_${String(entity.method ?? 'UNKNOWN').toUpperCase()}`,
          amount: moneyString(dec(entity.amount).div(100)),
          paidAt: entity.created_at ? new Date(Number(entity.created_at) * 1000) : new Date(),
          note: 'Razorpay reported this payment as failed.',
          providerPaymentId: String(entity.id),
          status: 'FAILED',
          logs: { create: { status: 'FAILED', note: 'Razorpay payment.failed webhook.' } }
        }
      });
    }
    return { processed: true, reason: 'FAILED_RECORDED' };
  }

  return applyCapturedPayment(tx, { order, entity, source: 'Razorpay webhook' });
}

async function recordWebhookEvent({ rawBody, event, eventId, source }) {
  const providerEventId = eventId || createHash('sha256').update(rawBody).digest('hex');
  const existing = await prisma.webhookEvent.findUnique({ where: { provider_providerEventId: { provider: PROVIDER, providerEventId } } });
  if (existing?.processedAt) return { duplicate: true, result: { processed: true, reason: 'DUPLICATE_EVENT' } };

  let webhook = existing;
  if (!webhook) {
    try {
      webhook = await prisma.webhookEvent.create({
        data: { provider: PROVIDER, providerEventId, payload: { source, event } }
      });
    } catch (error) {
      if (error?.code !== 'P2002') throw error;
      webhook = await prisma.webhookEvent.findUnique({ where: { provider_providerEventId: { provider: PROVIDER, providerEventId } } });
      if (!webhook) throw error;
    }
  }
  if (webhook.processedAt) return { duplicate: true, result: { processed: true, reason: 'DUPLICATE_EVENT' } };

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "WebhookEvent" WHERE id = ${webhook.id} FOR UPDATE`;
    const current = await tx.webhookEvent.findUnique({ where: { id: webhook.id } });
    if (current.processedAt) return { duplicate: true, result: { processed: true, reason: 'DUPLICATE_EVENT' } };

    let result;
    try {
      result = await processPaymentEvent(tx, event, event.event);
    } catch (error) {
      if (error instanceof AppError && error.status >= 400 && error.status < 500) {
        await tx.webhookEvent.update({ where: { id: webhook.id }, data: { processedAt: new Date() } });
        return { duplicate: false, result: { processed: false, reason: error.code, message: error.message } };
      }
      throw error;
    }
    await tx.webhookEvent.update({ where: { id: webhook.id }, data: { processedAt: new Date() } });
    return { duplicate: false, result };
  });
}

export async function processRazorpayWebhook({ rawBody, signature, eventId }) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new AppError(503, 'PAYMENT_PROVIDER_NOT_CONFIGURED', 'RAZORPAY_WEBHOOK_SECRET is not configured.');
  if (!Buffer.isBuffer(rawBody)) throw new AppError(500, 'RAW_BODY_REQUIRED', 'Razorpay webhook must be mounted before the JSON body parser.');
  if (!verifyRazorpaySignature(rawBody, signature, secret)) throw new AppError(400, 'INVALID_SIGNATURE', 'Razorpay webhook signature is invalid.');
  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new AppError(400, 'INVALID_PAYLOAD', 'Razorpay webhook payload is not valid JSON.');
  }
  return recordWebhookEvent({ rawBody, event, eventId, source: 'webhook' });
}

export async function verifyRazorpayPayment({ actor, paymentId, orderId }) {
  if (!paymentId || !orderId) throw new AppError(400, 'VALIDATION_ERROR', 'paymentId and orderId are required.');
  const scope = await invoiceScopeWhere(actor);
  const order = await prisma.providerOrder.findUnique({ where: { providerOrderId: String(orderId) }, include: { invoice: true } });
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Provider order was not found.');
  const visible = await prisma.invoice.findFirst({ where: { AND: [{ id: order.invoiceId }, scope] }, select: { id: true } });
  if (!visible) throw new AppError(404, 'NOT_FOUND', 'Provider order was not found.');
  if (order.provider !== PROVIDER) throw new AppError(409, 'PAYMENT_PROVIDER_MISMATCH', 'Order is not a Razorpay order.');

  const entity = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
  if (String(entity.order_id) !== String(orderId)) throw new AppError(409, 'PAYMENT_ORDER_MISMATCH', 'Razorpay payment is not linked to this order.');
  const event = { event: 'payment.captured', payload: { payment: { entity } } };
  const result = await recordWebhookEvent({
    rawBody: Buffer.from(JSON.stringify(event)),
    event,
    eventId: `verify:${paymentId}`,
    source: 'provider verification'
  });
  return result;
}
