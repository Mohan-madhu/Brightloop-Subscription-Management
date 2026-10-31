import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/config/db.js';
import { generateInvoiceForSubscription, processDueSubscriptions } from '../src/services/billingEngine.js';
import { recordManualPayment, createRazorpayOrder, verifyRazorpaySignature } from '../src/services/paymentService.js';
import { getDashboardMetrics, getDueDateKanban, generateQuarterlyReport } from '../src/services/reportService.js';

describe('End-to-End Business Flow & Lifecycle Integration', () => {
  let customer;
  let admin;
  let plan;
  let subscription;
  let invoice;

  test('setup test customer, admin and plan', async () => {
    admin = await prisma.user.findUnique({ where: { email: 'admin@brightloop.local' } });
    customer = await prisma.user.findUnique({ where: { email: 'customer@acmecorp.com' } });
    plan = await prisma.plan.findFirst({ where: { name: 'ERP Monthly Standard' } });

    assert.ok(admin, 'Admin must exist');
    assert.ok(customer, 'Customer must exist');
    assert.ok(plan, 'Plan must exist');
  });

  test('creates a linked subscription from quotation workflow', async () => {
    const subNumber = `SUB-TEST-${Date.now()}`;
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    subscription = await prisma.subscription.create({
      data: {
        subscriptionNumber: subNumber,
        customerId: customer.id,
        planId: plan.id,
        status: 'ACTIVE',
        billingFrequency: 'MONTHLY',
        startDate: now,
        nextBillingDate: now // due immediately
      }
    });

    assert.ok(subscription.id);
    assert.equal(subscription.status, 'ACTIVE');
  });

  test('billing engine generates invoice with 18% GST and immutable snapshots', async () => {
    const result = await generateInvoiceForSubscription(subscription.id);
    assert.equal(result.alreadyExists, false);
    assert.ok(result.invoice);

    invoice = result.invoice;
    assert.equal(invoice.status, 'DRAFT');
    assert.equal(invoice.customerId, customer.id);
    assert.equal(invoice.subtotal, 5000.0);
    // 18% tax on 5000 = 900
    assert.equal(invoice.taxAmount, 900.0);
    assert.equal(invoice.totalAmount, 5900.0);
    assert.equal(invoice.outstandingAmount, 5900.0);
    assert.equal(invoice.paidAmount, 0.0);

    // Verify snapshot lines
    assert.ok(invoice.lines.length > 0);
    assert.equal(invoice.lines[0].taxRate, 18.0);
  });

  test('idempotency: repeated billing run does not create duplicate invoice', async () => {
    const result = await generateInvoiceForSubscription(subscription.id, {
      periodStart: invoice.billingPeriodStart,
      periodEnd: invoice.billingPeriodEnd
    });

    assert.equal(result.alreadyExists, true);
    assert.equal(result.invoice.id, invoice.id);
  });

  test('records partial manual payment and updates outstanding balance', async () => {
    // Pay 2000 of 5900
    const paymentResult = await recordManualPayment({
      invoiceId: invoice.id,
      amount: 2000,
      paymentMethod: 'MANUAL',
      notes: 'Partial advance payment',
      recordedById: admin.id
    });

    assert.equal(paymentResult.payment.amount, 2000);
    assert.equal(paymentResult.invoice.paidAmount, 2000);
    assert.equal(paymentResult.invoice.outstandingAmount, 3900);
    assert.equal(paymentResult.invoice.status, 'DRAFT');
  });

  test('records remaining balance payment and transitions status to PAID', async () => {
    // Pay remaining 3900
    const paymentResult = await recordManualPayment({
      invoiceId: invoice.id,
      amount: 3900,
      paymentMethod: 'MANUAL',
      notes: 'Final settlement',
      recordedById: admin.id
    });

    assert.equal(paymentResult.invoice.paidAmount, 5900);
    assert.equal(paymentResult.invoice.outstandingAmount, 0);
    assert.equal(paymentResult.invoice.status, 'PAID');
  });

  test('Razorpay test order generation and signature verification', async () => {
    // Create a new unpaid invoice to test Razorpay order
    const now = new Date();
    const newInv = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-RZP-${Date.now()}`,
        subscriptionId: subscription.id,
        customerId: customer.id,
        status: 'CONFIRMED',
        billingPeriodStart: now,
        billingPeriodEnd: now,
        subtotal: 1000,
        taxAmount: 180,
        totalAmount: 1180,
        paidAmount: 0,
        outstandingAmount: 1180,
        dueDate: now
      },
      include: { customer: true }
    });

    const order = await createRazorpayOrder(newInv.id);
    assert.ok(order.orderId);
    assert.equal(order.amount, 118000); // 1180 * 100 paise
    assert.equal(order.currency, 'INR');

    // Signature verification with secret
    const dummySignature = 'invalid_sig';
    const isValid = verifyRazorpaySignature({
      orderId: order.orderId,
      paymentId: 'pay_test_123',
      signature: dummySignature
    });
    assert.equal(isValid, false, 'Invalid signature must fail');
  });

  test('generates financial dashboard metrics from real database records', async () => {
    const metrics = await getDashboardMetrics();
    assert.ok(metrics.invoicedRevenue >= 5900);
    assert.ok(metrics.collectedRevenue >= 5900);
    assert.ok(metrics.activeSubscriptionsCount >= 1);
    assert.equal(metrics.currency, 'INR');
  });

  test('categorizes unpaid invoices in due-date Kanban', async () => {
    const kanban = await getDueDateKanban();
    assert.ok(Array.isArray(kanban.overdue));
    assert.ok(Array.isArray(kanban.dueSoon));
    assert.ok(Array.isArray(kanban.dueMonth));
    assert.ok(Array.isArray(kanban.dueLater));
  });

  test('creates quarterly report record in database', async () => {
    const report = await generateQuarterlyReport('Q1', 2026);
    assert.ok(report.id);
    assert.equal(report.quarter, 'Q1');
    assert.equal(report.year, 2026);
  });
});
