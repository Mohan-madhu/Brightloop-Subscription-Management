/**
 * Brightloop Billing & Payment Demo Fixtures
 * 
 * Provides deterministic, isolated test fixtures for automated testing,
 * load simulations, and verification without mutating shared databases.
 */

export const DEMO_COMPANY = Object.freeze({
  legalName: 'Brightloop Technologies India Private Limited',
  publicName: 'Brightloop Cloud',
  supportEmail: 'support@brightloop.test',
  billingEmail: 'billing@brightloop.test',
  address: 'Level 5, Tower B, Cyber City, Gurugram, Haryana 122002, India',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  gstin: '06AAACB1234F1Z5'
});

export const TAX_MATRIX = Object.freeze([
  { id: 'tax_cgst_9', name: 'CGST 9%', rate: '9.00', taxExclusive: true, active: true },
  { id: 'tax_sgst_9', name: 'SGST 9%', rate: '9.00', taxExclusive: true, active: true },
  { id: 'tax_igst_18', name: 'IGST 18%', rate: '18.00', taxExclusive: true, active: true },
  { id: 'tax_cgst_2_5', name: 'CGST 2.5%', rate: '2.50', taxExclusive: true, active: true },
  { id: 'tax_sgst_2_5', name: 'SGST 2.5%', rate: '2.50', taxExclusive: true, active: true },
  { id: 'tax_igst_5', name: 'IGST 5%', rate: '5.00', taxExclusive: true, active: true },
  { id: 'tax_cess_12', name: 'Compensation Cess 12%', rate: '12.00', taxExclusive: true, active: true },
  { id: 'tax_exempt', name: 'GST Exempt 0%', rate: '0.00', taxExclusive: true, active: true }
]);

export const BILLING_INTERVALS = Object.freeze([
  { id: 'int_daily', code: 'DAILY', name: 'Daily', unit: 'day', count: 1, active: true },
  { id: 'int_weekly', code: 'WEEKLY', name: 'Weekly', unit: 'week', count: 1, active: true },
  { id: 'int_biweekly', code: 'BIWEEKLY', name: 'Bi-Weekly', unit: 'week', count: 2, active: true },
  { id: 'int_monthly', code: 'MONTHLY', name: 'Monthly', unit: 'month', count: 1, active: true },
  { id: 'int_quarterly', code: 'QUARTERLY', name: 'Quarterly', unit: 'month', count: 3, active: true },
  { id: 'int_semiannual', code: 'SEMIANNUAL', name: 'Semi-Annual', unit: 'month', count: 6, active: true },
  { id: 'int_annual', code: 'ANNUAL', name: 'Annual', unit: 'year', count: 1, active: true }
]);

export const DEMO_PLANS = Object.freeze([
  {
    id: 'plan_starter_monthly',
    name: 'Starter Cloud - Monthly',
    billingIntervalId: 'int_monthly',
    billingInterval: BILLING_INTERVALS[3],
    price: '999.00',
    minimumQuantity: 1,
    allowEarlyClosure: true,
    allowPause: true,
    allowRenewal: true,
    allowEndDateClosure: true,
    active: true,
    version: 1,
    products: [
      { productId: 'prod_core_platform', isAddon: false, price: '999.00' },
      { productId: 'prod_extra_storage', isAddon: true, price: '199.00' },
      { productId: 'prod_priority_sla', isAddon: true, price: '499.00' }
    ]
  },
  {
    id: 'plan_growth_monthly',
    name: 'Growth Cloud - Monthly',
    billingIntervalId: 'int_monthly',
    billingInterval: BILLING_INTERVALS[3],
    price: '2999.00',
    minimumQuantity: 1,
    allowEarlyClosure: true,
    allowPause: true,
    allowRenewal: true,
    allowEndDateClosure: true,
    active: true,
    version: 1,
    products: [
      { productId: 'prod_growth_platform', isAddon: false, price: '2999.00' },
      { productId: 'prod_extra_storage', isAddon: true, price: '199.00' },
      { productId: 'prod_api_pack', isAddon: true, price: '799.00' },
      { productId: 'prod_priority_sla', isAddon: true, price: '499.00' }
    ]
  },
  {
    id: 'plan_enterprise_annual',
    name: 'Enterprise Dedicated - Annual',
    billingIntervalId: 'int_annual',
    billingInterval: BILLING_INTERVALS[6],
    price: '49999.00',
    minimumQuantity: 1,
    allowEarlyClosure: false,
    allowPause: false,
    allowRenewal: true,
    allowEndDateClosure: true,
    active: true,
    version: 1,
    products: [
      { productId: 'prod_enterprise_core', isAddon: false, price: '49999.00' },
      { productId: 'prod_dedicated_ip', isAddon: true, price: '4999.00' },
      { productId: 'prod_audit_compliance', isAddon: true, price: '12999.00' }
    ]
  },
  {
    id: 'plan_micro_daily',
    name: 'Compute Sandbox - Daily',
    billingIntervalId: 'int_daily',
    billingInterval: BILLING_INTERVALS[0],
    price: '49.00',
    minimumQuantity: 1,
    allowEarlyClosure: true,
    allowPause: true,
    allowRenewal: true,
    allowEndDateClosure: true,
    active: true,
    version: 1,
    products: [
      { productId: 'prod_sandbox_node', isAddon: false, price: '49.00' }
    ]
  },
  {
    id: 'plan_sprint_weekly',
    name: 'Dev Sprint - Weekly',
    billingIntervalId: 'int_weekly',
    billingInterval: BILLING_INTERVALS[1],
    price: '349.00',
    minimumQuantity: 1,
    allowEarlyClosure: true,
    allowPause: true,
    allowRenewal: true,
    allowEndDateClosure: true,
    active: true,
    version: 1,
    products: [
      { productId: 'prod_sprint_cluster', isAddon: false, price: '349.00' }
    ]
  }
]);

export const DEMO_DISCOUNTS = Object.freeze([
  {
    id: 'disc_launch_10',
    code: 'LAUNCH10',
    kind: 'PERCENTAGE',
    amount: '10.00',
    active: true,
    startsAt: '2026-01-01',
    endsAt: '2026-12-31',
    minimumPurchase: null,
    minimumQuantity: null,
    usageLimit: 1000,
    targets: []
  },
  {
    id: 'disc_fixed_500',
    code: 'SAVE500',
    kind: 'FIXED',
    amount: '500.00',
    active: true,
    startsAt: '2026-01-01',
    endsAt: '2026-12-31',
    minimumPurchase: '2000.00',
    minimumQuantity: null,
    usageLimit: 50,
    targets: []
  },
  {
    id: 'disc_startup_25',
    code: 'STARTUP25',
    kind: 'PERCENTAGE',
    amount: '25.00',
    active: true,
    startsAt: '2026-01-01',
    endsAt: '2026-06-30',
    minimumPurchase: '1000.00',
    minimumQuantity: 2,
    usageLimit: 200,
    targets: []
  },
  {
    id: 'disc_targeted_storage',
    code: 'STORAGE50',
    kind: 'FIXED',
    amount: '100.00',
    active: true,
    startsAt: null,
    endsAt: null,
    minimumPurchase: null,
    minimumQuantity: null,
    usageLimit: 500,
    targets: [{ productId: 'prod_extra_storage' }]
  },
  {
    id: 'disc_flash_sale',
    code: 'FLASH50',
    kind: 'PERCENTAGE',
    amount: '50.00',
    active: true,
    startsAt: '2026-10-01',
    endsAt: '2026-10-31',
    minimumPurchase: '5000.00',
    minimumQuantity: 1,
    usageLimit: 10,
    targets: []
  },
  {
    id: 'disc_expired',
    code: 'OLDYEAR',
    kind: 'PERCENTAGE',
    amount: '15.00',
    active: true,
    startsAt: '2025-01-01',
    endsAt: '2025-12-31',
    minimumPurchase: null,
    minimumQuantity: null,
    usageLimit: 100,
    targets: []
  },
  {
    id: 'disc_inactive',
    code: 'DISABLED20',
    kind: 'PERCENTAGE',
    amount: '20.00',
    active: false,
    startsAt: null,
    endsAt: null,
    minimumPurchase: null,
    minimumQuantity: null,
    usageLimit: null,
    targets: []
  }
]);

// Deterministic customer dataset generation for tests and simulation
export function generateTestCustomers(count = 50) {
  const cities = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Gurugram', 'Noida', 'Kolkata', 'Ahmedabad'];
  const states = ['Karnataka', 'Maharashtra', 'Delhi', 'Telangana', 'Maharashtra', 'Tamil Nadu', 'Haryana', 'Uttar Pradesh', 'West Bengal', 'Gujarat'];
  const customers = [];

  for (let i = 1; i <= count; i += 1) {
    const idx = (i - 1) % cities.length;
    const city = cities[idx];
    const state = states[idx];
    const stateCode = String(i % 35 + 1).padStart(2, '0');
    const gstin = `${stateCode}AABCB${String(1000 + i).slice(0, 4)}A1Z${i % 9 + 1}`;

    customers.push({
      id: `cust_${String(i).padStart(4, '0')}`,
      userId: `user_c_${String(i).padStart(4, '0')}`,
      legalName: `Demo Enterprise Client ${i} Private Limited`,
      billingEmail: `accounts.client${i}@demo-enterprise.test`,
      billingAddress: {
        line1: `Suite ${100 + i}, Tech Park Phase ${i % 4 + 1}`,
        city,
        state,
        pincode: `${560000 + (i % 99)}`,
        country: 'India',
        gstin
      },
      paymentTerms: i % 3 === 0 ? 'Net 30 days' : i % 3 === 1 ? 'Net 15 days' : 'Due on receipt'
    });
  }
  return customers;
}

// Generates subscription line inputs
export function generateSubscriptionLines(plan, addonCount = 1) {
  const lines = [
    {
      key: `line_base_${plan.id}`,
      description: `${plan.name} - Base Subscription`,
      productId: plan.products[0].productId,
      variantId: null,
      isAddon: false,
      quantity: 1,
      unitPrice: plan.products[0].price,
      taxes: [
        { name: 'CGST 9%', rate: '9.00' },
        { name: 'SGST 9%', rate: '9.00' }
      ]
    }
  ];

  const availableAddons = plan.products.filter((p) => p.isAddon);
  for (let i = 0; i < Math.min(addonCount, availableAddons.length); i += 1) {
    const addon = availableAddons[i];
    lines.push({
      key: `line_addon_${addon.productId}`,
      description: `Addon Service: ${addon.productId}`,
      productId: addon.productId,
      variantId: null,
      isAddon: true,
      quantity: i + 2,
      unitPrice: addon.price,
      taxes: [
        { name: 'CGST 9%', rate: '9.00' },
        { name: 'SGST 9%', rate: '9.00' }
      ]
    });
  }
  return lines;
}

// Deterministic Razorpay Webhook Event generators
export function mockRazorpayWebhookEvent({
  event = 'payment.captured',
  paymentId = 'pay_demo_1001',
  orderId = 'order_demo_1001',
  amountPaise = 235800,
  currency = 'INR',
  method = 'upi',
  createdAt = Math.floor(Date.now() / 1000)
} = {}) {
  return {
    entity: 'event',
    account_id: 'acc_demo_brightloop',
    event,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: paymentId,
          entity: 'payment',
          amount: amountPaise,
          currency,
          status: event === 'payment.failed' ? 'failed' : 'captured',
          order_id: orderId,
          invoice_id: null,
          international: false,
          method,
          amount_refunded: 0,
          refund_status: null,
          captured: event !== 'payment.failed',
          description: 'Brightloop Subscription Invoice Payment',
          card_id: null,
          bank: null,
          wallet: null,
          vpa: method === 'upi' ? 'customer@okhdfcbank' : null,
          email: 'finance@client.test',
          contact: '+919876543210',
          notes: {
            platform: 'Brightloop',
            mode: 'test'
          },
          fee: Math.round(amountPaise * 0.02),
          tax: Math.round(amountPaise * 0.02 * 0.18),
          error_code: event === 'payment.failed' ? 'BAD_REQUEST_ERROR' : null,
          error_description: event === 'payment.failed' ? 'Payment was declined by issuing bank' : null,
          created_at: createdAt
        }
      }
    },
    created_at: createdAt
  };
}
