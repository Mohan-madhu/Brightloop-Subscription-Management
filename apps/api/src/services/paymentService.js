import crypto from 'crypto';
import prisma from '../config/db.js';
import { config } from '../config/env.js';
import { round } from '../utils/pricing.js';

/**
 * Records a manual payment (partial or full) against an invoice.
 */
export async function recordManualPayment({ invoiceId, amount, paymentMethod = 'MANUAL', notes = '', recordedById }) {
  const numericAmount = round(Number(amount));
  if (numericAmount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'CANCELLED') {
      throw new Error('Cannot record payment for a cancelled invoice');
    }

    if (numericAmount > invoice.outstandingAmount) {
      throw new Error(
        `Payment amount (₹${numericAmount}) exceeds outstanding balance (₹${invoice.outstandingAmount})`
      );
    }

    // 1. Create payment entry
    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: numericAmount,
        paymentMethod,
        status: 'SUCCESS',
        notes,
        recordedById
      }
    });

    // 2. Update invoice balances
    const newPaidAmount = round(invoice.paidAmount + numericAmount);
    const newOutstanding = round(Math.max(0, invoice.totalAmount - newPaidAmount));
    const newStatus = newOutstanding <= 0 ? 'PAID' : invoice.status;

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstanding,
        status: newStatus
      }
    });

    return {
      payment,
      invoice: updatedInvoice
    };
  });
}

/**
 * Generates a Razorpay Test Mode Order for the outstanding invoice balance.
 */
export async function createRazorpayOrder(invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true }
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.outstandingAmount <= 0) {
    throw new Error('Invoice is already fully paid');
  }

  // Amount in paise (1 INR = 100 paise)
  const amountPaise = Math.round(invoice.outstandingAmount * 100);
  const receipt = `rcpt_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // In test mode / without live keys, generate consistent test order ID
  const testOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;

  return {
    orderId: testOrderId,
    amount: amountPaise,
    currency: 'INR',
    receipt,
    invoiceId: invoice.id,
    customer: {
      name: invoice.customer.name,
      email: invoice.customer.email,
      phone: invoice.customer.phone || ''
    },
    keyId: config.razorpay.keyId
  };
}

/**
 * Server-side Razorpay signature verification.
 */
export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const secret = config.razorpay.keySecret;
  if (!secret) return false;

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
}

/**
 * Reconciles a verified Razorpay payment and updates the invoice balance.
 */
export async function handleSuccessfulRazorpayPayment({ invoiceId, razorpayOrderId, razorpayPaymentId, amount }) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Check duplicate payment
    const existingPayment = await tx.payment.findFirst({
      where: { razorpayPaymentId }
    });

    if (existingPayment) {
      return { duplicate: true, payment: existingPayment, invoice };
    }

    const payAmount = round(Number(amount || invoice.outstandingAmount));

    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: payAmount,
        paymentMethod: 'RAZORPAY',
        razorpayOrderId,
        razorpayPaymentId,
        status: 'SUCCESS'
      }
    });

    const newPaidAmount = round(invoice.paidAmount + payAmount);
    const newOutstanding = round(Math.max(0, invoice.totalAmount - newPaidAmount));
    const newStatus = newOutstanding <= 0 ? 'PAID' : invoice.status;

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstanding,
        status: newStatus
      }
    });

    return { duplicate: false, payment, invoice: updatedInvoice };
  });
}

/**
 * Webhook signature verification
 */
export function verifyWebhookSignature(payloadString, signature) {
  const secret = config.razorpay.webhookSecret;
  if (!secret || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  return expectedSignature === signature;
}
