import crypto from 'crypto';
import prisma from '../config/db.js';
import { calculateTotals } from '../utils/pricing.js';
import { calculateNextBillingDate } from '../utils/date.js';

// --- TEMPLATES ---
export async function listTemplates(req, res, next) {
  try {
    const templates = await prisma.quotationTemplate.findMany({
      include: { lines: true }
    });
    return res.status(200).json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
}

export async function createTemplate(req, res, next) {
  try {
    const { name, validityDays = 30, lines = [] } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: { message: 'Template name is required' } });
    }

    const template = await prisma.quotationTemplate.create({
      data: {
        name,
        validityDays: parseInt(validityDays, 10),
        createdById: req.user.id,
        lines: {
          create: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId || null,
            planId: l.planId || null,
            quantity: parseInt(l.quantity || 1, 10),
            unitPrice: parseFloat(l.unitPrice || 0)
          }))
        }
      },
      include: { lines: true }
    });

    return res.status(201).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
}

// --- QUOTATIONS ---
export async function listQuotations(req, res, next) {
  try {
    const where = {};

    // Customer can only see their own quotations
    if (req.user.role === 'CUSTOMER') {
      where.customerId = req.user.id;
    } else if (req.user.role === 'MARKETING') {
      // Marketing sees quotations for their assigned customers
      where.customer = { assignedMarketingId: req.user.id };
    }

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        lines: true,
        subscription: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ success: true, data: quotations });
  } catch (err) {
    next(err);
  }
}

export async function createQuotation(req, res, next) {
  try {
    const { customerId, lines = [], validityDays = 30, discountCode, planId } = req.body;

    if (!customerId || lines.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Customer ID and at least one line item are required' }
      });
    }

    // Authorization check for marketing:
    if (req.user.role === 'MARKETING') {
      const customer = await prisma.user.findUnique({ where: { id: customerId } });
      if (!customer || customer.assignedMarketingId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: { message: 'You can only create quotations for your assigned customers' }
        });
      }
    }

    // Default tax
    const defaultTax = await prisma.tax.findFirst({ where: { isDefault: true, status: 'ACTIVE' } });
    const taxRate = defaultTax ? defaultTax.rate : 18.0;

    // Check discount
    let discount = null;
    if (discountCode) {
      discount = await prisma.discount.findUnique({ where: { code: discountCode.toUpperCase() } });
    }

    const calculated = calculateTotals({
      items: lines,
      discount,
      taxRate
    });

    const quotationNumber = `QT-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(validityDays, 10));

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId,
        createdById: req.user.id,
        status: 'SENT',
        subtotal: calculated.subtotal,
        discountId: calculated.appliedDiscount ? calculated.appliedDiscount.id : null,
        discountAmount: calculated.discountAmount,
        taxAmount: calculated.taxAmount,
        totalAmount: calculated.totalAmount,
        expiresAt,
        lines: {
          create: calculated.lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId || null,
            planId: l.planId || planId || null,
            description: l.description || 'Subscription Line',
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            subtotal: l.subtotal
          }))
        }
      },
      include: {
        lines: true,
        customer: true
      }
    });

    return res.status(201).json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
}

export async function acceptQuotation(req, res, next) {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { lines: true, customer: true, subscription: true }
    });

    if (!quotation) {
      return res.status(404).json({ success: false, error: { message: 'Quotation not found' } });
    }

    // Customer can only accept their own quotation
    if (req.user.role === 'CUSTOMER' && quotation.customerId !== req.user.id) {
      return res.status(403).json({ success: false, error: { message: 'Access denied' } });
    }

    // Expiry check
    if (new Date() > new Date(quotation.expiresAt)) {
      return res.status(400).json({ success: false, error: { message: 'Quotation has expired and cannot be accepted' } });
    }

    // Already accepted check
    if (quotation.status === 'ACCEPTED' || quotation.subscription) {
      return res.status(409).json({ success: false, error: { message: 'Quotation has already been accepted' } });
    }

    // Convert quotation to linked subscription transactionally
    const result = await prisma.$transaction(async (tx) => {
      // Find plan ID from lines or default plan
      const planLine = quotation.lines.find((l) => l.planId);
      let plan = null;
      if (planLine) {
        plan = await tx.plan.findUnique({ where: { id: planLine.planId } });
      }
      if (!plan) {
        plan = await tx.plan.findFirst();
      }

      const subscriptionNumber = `SUB-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const startDate = new Date();
      const nextBillingDate = calculateNextBillingDate(startDate, plan.billingInterval);

      const subscription = await tx.subscription.create({
        data: {
          subscriptionNumber,
          quotationId: quotation.id,
          customerId: quotation.customerId,
          planId: plan.id,
          status: 'ACTIVE',
          billingFrequency: plan.billingInterval,
          startDate,
          nextBillingDate,
          lines: {
            create: quotation.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              quantity: l.quantity,
              unitPrice: l.unitPrice
            }))
          }
        },
        include: { lines: true, plan: true }
      });

      const updatedQuotation = await tx.quotation.update({
        where: { id: quotation.id },
        data: { status: 'ACCEPTED' }
      });

      return { subscription, quotation: updatedQuotation };
    });

    return res.status(200).json({
      success: true,
      message: 'Quotation accepted and subscription activated',
      data: result
    });
  } catch (err) {
    next(err);
  }
}
