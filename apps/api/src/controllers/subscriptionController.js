import crypto from 'crypto';
import prisma from '../config/db.js';
import { calculateNextBillingDate } from '../utils/date.js';
import { generateInvoiceForSubscription } from '../services/billingEngine.js';

export async function createSubscription(req, res, next) {
  try {
    const { planId, customerId: targetCustomerId } = req.body;
    const customerId = req.user.role === 'CUSTOMER' ? req.user.id : (targetCustomerId || req.user.id);

    if (!planId) {
      return res.status(400).json({ success: false, error: { message: 'Plan ID is required' } });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: { product: true }
    });

    if (!plan) {
      return res.status(404).json({ success: false, error: { message: 'Plan not found' } });
    }

    const subscriptionNumber = `SUB-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const startDate = new Date();
    const nextBillingDate = calculateNextBillingDate(startDate, plan.billingInterval);

    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNumber,
        customerId,
        planId: plan.id,
        status: 'ACTIVE',
        billingFrequency: plan.billingInterval,
        startDate,
        nextBillingDate,
        lines: {
          create: [
            {
              productId: plan.productId,
              quantity: 1,
              unitPrice: plan.price
            }
          ]
        }
      },
      include: {
        lines: true,
        plan: { include: { product: true } }
      }
    });

    // Automatically generate initial invoice for the subscription
    let initialInvoice = null;
    try {
      const invRes = await generateInvoiceForSubscription(subscription.id, {
        periodStart: startDate,
        periodEnd: nextBillingDate
      });
      if (invRes?.invoice) {
        initialInvoice = await prisma.invoice.update({
          where: { id: invRes.invoice.id },
          data: { status: 'CONFIRMED', sentAt: new Date() }
        });
      }
    } catch (invErr) {
      console.error('[Subscription] Failed to generate initial invoice:', invErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Subscribed to plan successfully. Initial invoice has been generated.',
      data: {
        ...subscription,
        invoice: initialInvoice
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function listSubscriptions(req, res, next) {
  try {
    const where = {};

    // Customer sees only own subscriptions
    if (req.user.role === 'CUSTOMER') {
      where.customerId = req.user.id;
    } else if (req.user.role === 'MARKETING') {
      where.customer = { assignedMarketingId: req.user.id };
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        plan: { include: { product: true } },
        lines: true,
        invoices: { select: { id: true, invoiceNumber: true, status: true, totalAmount: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ success: true, data: subscriptions });
  } catch (err) {
    next(err);
  }
}

export async function getSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: { include: { product: true } },
        lines: true,
        invoices: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: { message: 'Subscription not found' } });
    }

    if (req.user.role === 'CUSTOMER' && subscription.customerId !== req.user.id) {
      return res.status(403).json({ success: false, error: { message: 'Access denied' } });
    }

    return res.status(200).json({ success: true, data: subscription });
  } catch (err) {
    next(err);
  }
}

export async function pauseSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const subscription = await prisma.subscription.findUnique({ where: { id } });

    if (!subscription) {
      return res.status(404).json({ success: false, error: { message: 'Subscription not found' } });
    }

    if (subscription.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: { message: `Cannot pause subscription in ${subscription.status} status` }
      });
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: 'PAUSED',
        pauseDate: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Subscription paused. Recurring automatic invoices are suspended.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

export async function resumeSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true }
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: { message: 'Subscription not found' } });
    }

    if (subscription.status !== 'PAUSED') {
      return res.status(400).json({
        success: false,
        error: { message: `Cannot resume subscription in ${subscription.status} status` }
      });
    }

    const now = new Date();
    const nextBillingDate = calculateNextBillingDate(now, subscription.billingFrequency);

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        resumeDate: now,
        nextBillingDate
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Subscription resumed successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

export async function closeSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const subscription = await prisma.subscription.findUnique({ where: { id } });

    if (!subscription) {
      return res.status(404).json({ success: false, error: { message: 'Subscription not found' } });
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: 'CLOSED',
        expiryDate: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Subscription closed successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}
