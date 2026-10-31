import prisma from '../config/db.js';
import { calculateTotals, round } from '../utils/pricing.js';
import { calculateNextBillingDate } from '../utils/date.js';

/**
 * Generates an invoice for an eligible subscription for a specific billing period.
 * Idempotent: checks for existing invoice for this subscription & period.
 */
export async function generateInvoiceForSubscription(subscriptionId, options = {}) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch subscription with plan, customer, lines, and add-ons
    const subscription = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        customer: true,
        plan: {
          include: {
            product: true
          }
        },
        lines: true
      }
    });

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (subscription.status !== 'ACTIVE') {
      throw new Error(`Subscription is ${subscription.status}, only ACTIVE subscriptions can be billed`);
    }

    // 2. Determine billing period
    const periodStart = options.periodStart ? new Date(options.periodStart) : new Date(subscription.nextBillingDate);
    const periodEnd = options.periodEnd
      ? new Date(options.periodEnd)
      : calculateNextBillingDate(periodStart, subscription.billingFrequency);

    // 3. Idempotency check: verify invoice does not already exist for this period
    const existingInvoice = await tx.invoice.findFirst({
      where: {
        subscriptionId: subscription.id,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd
      }
    });

    if (existingInvoice) {
      return {
        alreadyExists: true,
        invoice: existingInvoice,
        message: 'Invoice already generated for this billing period'
      };
    }

    // 4. Build pricing items from subscription lines
    const items = subscription.lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      salesPrice: line.unitPrice,
      quantity: line.quantity,
      description: `${subscription.plan.name} - Subscription Service`
    }));

    // If no explicit lines, bill the plan directly
    if (items.length === 0) {
      items.push({
        productId: subscription.plan.productId,
        salesPrice: subscription.plan.price,
        quantity: 1,
        description: `${subscription.plan.name} (${subscription.billingFrequency})`
      });
    }

    // Fetch default tax rate
    const defaultTax = await tx.tax.findFirst({
      where: { isDefault: true, status: 'ACTIVE' }
    });
    const taxRate = defaultTax ? defaultTax.rate : 18.0;

    // Check for eligible discount if provided or auto-evaluate
    let appliedDiscount = null;
    if (options.discountCode) {
      appliedDiscount = await tx.discount.findUnique({
        where: { code: options.discountCode }
      });
    }

    const calculated = calculateTotals({
      items,
      discount: appliedDiscount,
      taxRate
    });

    // 5. Generate unique invoice number: INV-YYYYMMDD-XXXX
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const dateStr = periodStart.toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `INV-${dateStr}-${randomHex}`;

    // Due date (default 15 days from issue)
    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + 15);

    // 6. Create invoice record
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
        status: 'DRAFT',
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        subtotal: calculated.subtotal,
        discountAmount: calculated.discountAmount,
        taxAmount: calculated.taxAmount,
        totalAmount: calculated.totalAmount,
        paidAmount: 0.0,
        outstandingAmount: calculated.totalAmount,
        dueDate,
        lines: {
          create: calculated.lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId || null,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            subtotal: l.subtotal,
            taxRate,
            taxAmount: round((l.subtotal * taxRate) / 100)
          }))
        }
      },
      include: {
        lines: true,
        customer: true,
        subscription: true
      }
    });

    // 7. Reserve discount if applied
    if (calculated.appliedDiscount) {
      await tx.invoiceDiscount.create({
        data: {
          invoiceId: invoice.id,
          discountId: calculated.appliedDiscount.id,
          code: calculated.appliedDiscount.code,
          amount: calculated.discountAmount,
          status: 'RESERVED'
        }
      });
    }

    // 8. Advance subscription nextBillingDate
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        nextBillingDate: periodEnd
      }
    });

    return {
      alreadyExists: false,
      invoice,
      message: 'Invoice created successfully'
    };
  });
}

/**
 * Recurring engine batch processor:
 * Queries all ACTIVE subscriptions whose nextBillingDate is due (<= now)
 * and generates periodic invoices safely.
 */
export async function processDueSubscriptions() {
  const now = new Date();

  // Find all due active subscriptions
  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      nextBillingDate: {
        lte: now
      }
    },
    take: 50 // Bounded batch for performance
  });

  const results = {
    processed: 0,
    created: 0,
    skipped: 0,
    errors: []
  };

  for (const sub of dueSubscriptions) {
    results.processed += 1;
    try {
      const res = await generateInvoiceForSubscription(sub.id);
      if (res.alreadyExists) {
        results.skipped += 1;
      } else {
        results.created += 1;
      }
    } catch (err) {
      results.errors.push({
        subscriptionId: sub.id,
        error: err.message
      });
    }
  }

  return results;
}
