import prisma from '../config/db.js';
import { generateInvoiceForSubscription, processDueSubscriptions } from '../services/billingEngine.js';
import { sendInvoiceEmail } from '../services/emailService.js';

export async function listInvoices(req, res, next) {
  try {
    const { status, customerId, page = 1, pageSize = 20 } = req.query;
    const where = {};

    if (req.user.role === 'CUSTOMER') {
      where.customerId = req.user.id;
    } else if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
    const take = parseInt(pageSize, 10);

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          subscription: { select: { id: true, subscriptionNumber: true, billingFrequency: true } },
          lines: true,
          payments: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.count({ where })
    ]);

    return res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page, 10),
        pageSize: take,
        totalCount,
        totalPages: Math.ceil(totalCount / take)
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: { include: { plan: true } },
        lines: true,
        invoiceDiscounts: true,
        payments: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: { message: 'Invoice not found' } });
    }

    if (req.user.role === 'CUSTOMER' && invoice.customerId !== req.user.id) {
      return res.status(403).json({ success: false, error: { message: 'Access denied' } });
    }

    return res.status(200).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function confirmInvoice(req, res, next) {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { customer: true, invoiceDiscounts: true }
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status !== 'DRAFT') {
        throw new Error(`Cannot confirm invoice in ${invoice.status} status`);
      }

      // Consume reserved discount if present
      for (const disc of invoice.invoiceDiscounts) {
        if (disc.status === 'RESERVED') {
          await tx.invoiceDiscount.update({
            where: { id: disc.id },
            data: { status: 'CONSUMED' }
          });
          await tx.discount.update({
            where: { id: disc.discountId },
            data: { usedCount: { increment: 1 } }
          });
        }
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          sentAt: new Date()
        },
        include: { customer: true, lines: true }
      });

      return updated;
    });

    // Send email notification safely
    await sendInvoiceEmail(result, result.customer);

    return res.status(200).json({
      success: true,
      message: 'Invoice confirmed and locked successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelInvoice(req, res, next) {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { invoiceDiscounts: true }
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === 'PAID') {
        throw new Error('Cannot cancel a fully paid invoice');
      }

      // Release reserved discount if present
      for (const disc of invoice.invoiceDiscounts) {
        if (disc.status === 'RESERVED') {
          await tx.invoiceDiscount.update({
            where: { id: disc.id },
            data: { status: 'RELEASED' }
          });
        }
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      return updated;
    });

    return res.status(200).json({
      success: true,
      message: 'Invoice cancelled and reserved discounts released',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function triggerBilling(req, res, next) {
  try {
    const { subscriptionId } = req.body;

    if (subscriptionId) {
      const result = await generateInvoiceForSubscription(subscriptionId);
      return res.status(200).json({ success: true, data: result });
    }

    const batchResults = await processDueSubscriptions();
    return res.status(200).json({
      success: true,
      message: 'Recurring billing run completed',
      data: batchResults
    });
  } catch (err) {
    next(err);
  }
}
