import prisma from '../config/db.js';
import {
  recordManualPayment,
  createRazorpayOrder,
  verifyRazorpaySignature,
  handleSuccessfulRazorpayPayment,
  verifyWebhookSignature
} from '../services/paymentService.js';

export async function createManualPayment(req, res, next) {
  try {
    const { invoiceId, amount, paymentMethod = 'MANUAL', notes = '' } = req.body;

    if (!invoiceId || !amount) {
      return res.status(400).json({
        success: false,
        error: { message: 'InvoiceId and amount are required' }
      });
    }

    const result = await recordManualPayment({
      invoiceId,
      amount,
      paymentMethod,
      notes,
      recordedById: req.user.id
    });

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function initRazorpayCheckout(req, res, next) {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ success: false, error: { message: 'InvoiceId is required' } });
    }

    // Customer can only pay for their own invoice
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      return res.status(404).json({ success: false, error: { message: 'Invoice not found' } });
    }

    if (req.user.role === 'CUSTOMER' && invoice.customerId !== req.user.id) {
      return res.status(403).json({ success: false, error: { message: 'Access denied' } });
    }

    const orderData = await createRazorpayOrder(invoiceId);

    return res.status(200).json({
      success: true,
      data: orderData
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyRazorpayPayment(req, res, next) {
  try {
    const { invoiceId, razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = req.body;

    if (!invoiceId || !razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing payment verification parameters' }
      });
    }

    // Verify signature if secret configured
    if (razorpaySignature) {
      const isValid = verifyRazorpaySignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature
      });

      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_SIGNATURE', message: 'Razorpay payment signature verification failed' }
        });
      }
    }

    const result = await handleSuccessfulRazorpayPayment({
      invoiceId,
      razorpayOrderId,
      razorpayPaymentId,
      amount
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified and recorded successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const payload = JSON.stringify(req.body);

    if (signature && !verifyWebhookSignature(payload, signature)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid webhook signature' } });
    }

    const event = req.body;
    const eventId = event.event_id || event.id || `evt_${Date.now()}`;

    // Webhook idempotency
    const existing = await prisma.webhookEvent.findUnique({ where: { eventId } });
    if (existing) {
      return res.status(200).json({ success: true, message: 'Event already processed' });
    }

    await prisma.webhookEvent.create({
      data: {
        eventId,
        eventType: event.event || 'payment.captured',
        payload,
        status: 'PROCESSED'
      }
    });

    // If payment captured event
    if (event.event === 'payment.captured' && event.payload?.payment?.entity) {
      const paymentEntity = event.payload.payment.entity;
      const notes = paymentEntity.notes || {};
      const invoiceId = notes.invoiceId;

      if (invoiceId) {
        await handleSuccessfulRazorpayPayment({
          invoiceId,
          razorpayOrderId: paymentEntity.order_id,
          razorpayPaymentId: paymentEntity.id,
          amount: paymentEntity.amount / 100
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    next(err);
  }
}
