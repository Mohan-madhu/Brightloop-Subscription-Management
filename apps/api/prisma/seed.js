import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Brightloop Database Seed ---');

  // 1. Password hashing (Argon2 / Bcrypt standard, >9 chars, upper, lower, special)
  const defaultAdminPass = await bcrypt.hash('Admin123!@#', 10);
  const defaultFinancePass = await bcrypt.hash('Finance123!@#', 10);
  const defaultMarketingPass = await bcrypt.hash('Marketing123!@#', 10);
  const defaultCustomerPass = await bcrypt.hash('Customer123!@#', 10);

  // 2. Users (Admin, Finance, Marketing, Customer)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@brightloop.local' },
    update: {},
    create: {
      email: 'admin@brightloop.local',
      name: 'System Administrator',
      passwordHash: defaultAdminPass,
      role: 'ADMIN',
      status: 'ACTIVE',
      isVerified: true
    }
  });

  const finance = await prisma.user.upsert({
    where: { email: 'finance@brightloop.local' },
    update: {},
    create: {
      email: 'finance@brightloop.local',
      name: 'Priya Sharma (Finance Lead)',
      passwordHash: defaultFinancePass,
      role: 'FINANCE',
      status: 'ACTIVE',
      isVerified: true
    }
  });

  const marketing = await prisma.user.upsert({
    where: { email: 'marketing@brightloop.local' },
    update: {},
    create: {
      email: 'marketing@brightloop.local',
      name: 'Rahul Verma (Marketing Exec)',
      passwordHash: defaultMarketingPass,
      role: 'MARKETING',
      status: 'ACTIVE',
      isVerified: true
    }
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@acmecorp.com' },
    update: {},
    create: {
      email: 'customer@acmecorp.com',
      name: 'Acme Global Corp (Arun Mehta)',
      passwordHash: defaultCustomerPass,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      phone: '+91 9876543210',
      assignedMarketingId: marketing.id,
      isVerified: true
    }
  });

  console.log('✓ Users seeded (Admin, Finance, Marketing, Customer)');

  // 3. Tax Rates (18% default GST e-services)
  const defaultTax = await prisma.tax.findFirst({ where: { name: 'GST 18%' } });
  if (!defaultTax) {
    await prisma.tax.create({
      data: {
        name: 'GST 18%',
        rate: 18.0,
        isDefault: true,
        status: 'ACTIVE'
      }
    });
  }

  // 4. Products & Variants
  let erpProduct = await prisma.product.findFirst({ where: { name: 'Brightloop ERP Cloud' } });
  if (!erpProduct) {
    erpProduct = await prisma.product.create({
      data: {
        name: 'Brightloop ERP Cloud',
        type: 'SERVICE',
        description: 'Comprehensive business management, inventory, and accounting platform.',
        salesPrice: 5000.0,
        costPrice: 2000.0,
        status: 'ACTIVE'
      }
    });

    await prisma.productVariant.createMany({
      data: [
        { productId: erpProduct.id, name: 'Standard Edition', sku: 'ERP-STD', priceAdjustment: 0.0, status: 'ACTIVE' },
        { productId: erpProduct.id, name: 'Odoo Integration Edition', sku: 'ERP-ODOO', priceAdjustment: 560.0, status: 'ACTIVE' },
        { productId: erpProduct.id, name: 'Enterprise Cluster Edition', sku: 'ERP-ENT', priceAdjustment: 2500.0, status: 'ACTIVE' }
      ]
    });
  }

  let crmProduct = await prisma.product.findFirst({ where: { name: 'Brightloop CRM Pro' } });
  if (!crmProduct) {
    crmProduct = await prisma.product.create({
      data: {
        name: 'Brightloop CRM Pro',
        type: 'SERVICE',
        description: 'Sales pipeline, lead tracking, and omnichannel customer communication.',
        salesPrice: 3000.0,
        costPrice: 1200.0,
        status: 'ACTIVE'
      }
    });

    await prisma.productVariant.createMany({
      data: [
        { productId: crmProduct.id, name: 'Single Seat', sku: 'CRM-1', priceAdjustment: 0.0, status: 'ACTIVE' },
        { productId: crmProduct.id, name: 'Team 5-Seat Pack', sku: 'CRM-5', priceAdjustment: 1200.0, status: 'ACTIVE' }
      ]
    });
  }
  console.log('✓ Products & Variants seeded');

  // 5. Add-Ons
  const addOnsList = [
    { name: '24/7 SLA Priority Support', description: 'Under 1-hour response SLA with dedicated helpline', price: 1500.0 },
    { name: 'Dedicated Cloud Database Instance', description: 'Isolated database with daily automated offsite backup', price: 2800.0 },
    { name: 'Custom Domain & SSO Setup', description: 'SAML2 / OAuth2 / OIDC custom integration', price: 900.0 }
  ];

  for (const item of addOnsList) {
    const existing = await prisma.addOn.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.addOn.create({ data: item });
    }
  }

  // 6. Subscription Plans
  const plans = [
    { productId: erpProduct.id, name: 'ERP Monthly Standard', billingInterval: 'MONTHLY', price: 5000.0, minQuantity: 1 },
    { productId: erpProduct.id, name: 'ERP Annual Enterprise', billingInterval: 'YEARLY', price: 52000.0, minQuantity: 1 },
    { productId: crmProduct.id, name: 'CRM Weekly Pro', billingInterval: 'WEEKLY', price: 850.0, minQuantity: 1 },
    { productId: crmProduct.id, name: 'CRM Daily Burst', billingInterval: 'DAILY', price: 150.0, minQuantity: 1 }
  ];

  for (const p of plans) {
    const existingPlan = await prisma.plan.findFirst({ where: { name: p.name } });
    if (!existingPlan) {
      await prisma.plan.create({ data: p });
    }
  }
  console.log('✓ Subscription Plans seeded');

  // 7. Discounts
  const discounts = [
    { code: 'WELCOME10', description: '10% Welcome Discount for New Subscriptions', type: 'PERCENTAGE', value: 10.0, minPurchase: 1000.0, maxUses: 100 },
    { code: 'FLAT500', description: 'Flat ₹500 off on orders over ₹3000', type: 'FIXED', value: 500.0, minPurchase: 3000.0, maxUses: 50 }
  ];

  for (const d of discounts) {
    await prisma.discount.upsert({
      where: { code: d.code },
      update: {},
      create: d
    });
  }

  // 8. Quotation Template
  const template = await prisma.quotationTemplate.findFirst({ where: { name: 'Standard SaaS Proposal' } });
  if (!template) {
    await prisma.quotationTemplate.create({
      data: {
        name: 'Standard SaaS Proposal',
        validityDays: 30,
        createdById: admin.id,
        lines: {
          create: [
            { productId: erpProduct.id, quantity: 1, unitPrice: 5000.0 }
          ]
        }
      }
    });
  }

  console.log('✓ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
