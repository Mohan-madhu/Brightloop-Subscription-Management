/**
 * 200 Enterprise Subscription Lifecycle & Billing Contract Scenarios.
 * Comprehensive simulation dataset modelling multi-year subscription progression,
 * quantity upgrades, add-on additions, pause/resumption windows, and invoice catch-up.
 */

import { DEMO_PLANS, BILLING_INTERVALS } from './billing-fixtures.js';

export function buildEnterpriseScenarios(count = 200) {
  const scenarios = [];
  const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED'];
  const termsList = ['Due on receipt', 'Net 15 days', 'Net 30 days', 'Net 60 days'];

  for (let i = 1; i <= count; i += 1) {
    const plan = DEMO_PLANS[(i - 1) % DEMO_PLANS.length];
    const status = statuses[(i - 1) % statuses.length];
    const paymentTerms = termsList[(i - 1) % termsList.length];
    const anchorDay = (i % 28) + 1; // 1 - 28 safe anchor or month end
    const subscriptionNumber = `SUB-ENT-${String(i).padStart(5, '0')}`;
    const customerId = `cust_${String((i % 50) + 1).padStart(4, '0')}`;

    const startYear = 2025;
    const startMonth = ((i - 1) % 12) + 1;
    const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
    const expiryDate = status === 'EXPIRED' ? `2026-06-30` : status === 'CLOSED' ? `2026-12-31` : null;

    const baseQuantity = (i % 5) + 1;
    const basePrice = Number(plan.price);
    const hasAddon = i % 2 === 0 && plan.products.length > 1;
    const addonQuantity = hasAddon ? (i % 3) + 1 : 0;
    const addonPrice = hasAddon ? Number(plan.products[1].price) : 0;

    const monthlyRunRate = (basePrice * baseQuantity) + (addonPrice * addonQuantity);

    const statusLogs = [
      {
        id: `sub_log_${i}_1`,
        subscriptionId: `sub_ent_${i}`,
        status: 'DRAFT',
        note: 'Subscription quotation drafted.',
        createdAt: new Date(`${startDate}T00:00:00.000Z`)
      },
      {
        id: `sub_log_${i}_2`,
        subscriptionId: `sub_ent_${i}`,
        status: 'ACTIVE',
        note: 'Quotation accepted; subscription activated.',
        effectiveAt: new Date(`${startDate}T00:00:00.000Z`),
        createdAt: new Date(`${startDate}T00:00:00.000Z`)
      }
    ];

    if (status === 'PAUSED') {
      statusLogs.push({
        id: `sub_log_${i}_3`,
        subscriptionId: `sub_ent_${i}`,
        status: 'PAUSED',
        note: 'Temporary seasonal pause requested by customer.',
        effectiveAt: new Date('2026-06-01T00:00:00.000Z'),
        createdAt: new Date('2026-06-01T00:00:00.000Z')
      });
    } else if (status === 'CLOSED') {
      statusLogs.push({
        id: `sub_log_${i}_3`,
        subscriptionId: `sub_ent_${i}`,
        status: 'CLOSED',
        note: 'Contract term completed; subscription closed.',
        effectiveAt: new Date('2026-12-31T00:00:00.000Z'),
        createdAt: new Date('2026-12-31T00:00:00.000Z')
      });
    } else if (status === 'EXPIRED') {
      statusLogs.push({
        id: `sub_log_${i}_3`,
        subscriptionId: `sub_ent_${i}`,
        status: 'EXPIRED',
        note: 'Subscription expired on end date.',
        effectiveAt: new Date('2026-06-30T00:00:00.000Z'),
        createdAt: new Date('2026-06-30T00:00:00.000Z')
      });
    }

    scenarios.push({
      scenarioIndex: i,
      subscriptionId: `sub_ent_${i}`,
      number: subscriptionNumber,
      customerId,
      planId: plan.id,
      planName: plan.name,
      billingInterval: plan.billingInterval,
      status,
      startDate,
      expiryDate,
      billingAnchorDay: anchorDay,
      paymentTerms,
      version: 1,
      baseQuantity,
      basePrice: basePrice.toFixed(2),
      hasAddon,
      addonQuantity,
      addonPrice: addonPrice.toFixed(2),
      monthlyRunRate: monthlyRunRate.toFixed(2),
      currency: 'INR',
      allowPause: plan.allowPause,
      allowRenewal: plan.allowRenewal,
      allowEarlyClosure: plan.allowEarlyClosure,
      allowEndDateClosure: plan.allowEndDateClosure,
      lines: [
        {
          id: `sub_line_${i}_1`,
          subscriptionId: `sub_ent_${i}`,
          productId: plan.products[0].productId,
          description: `${plan.name} - Core Unit`,
          quantity: baseQuantity,
          agreedPrice: basePrice.toFixed(2),
          isAddon: false
        },
        ...(hasAddon ? [
          {
            id: `sub_line_${i}_2`,
            subscriptionId: `sub_ent_${i}`,
            productId: plan.products[1].productId,
            description: `Add-on: ${plan.products[1].productId}`,
            quantity: addonQuantity,
            agreedPrice: addonPrice.toFixed(2),
            isAddon: true
          }
        ] : [])
      ],
      logs: statusLogs
    });
  }

  return scenarios;
}

export const ENTERPRISE_SCENARIOS = Object.freeze(buildEnterpriseScenarios(200));
