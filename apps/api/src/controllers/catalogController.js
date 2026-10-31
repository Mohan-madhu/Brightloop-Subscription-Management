import prisma from '../config/db.js';

// --- PRODUCTS ---
export async function listProducts(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: true,
        plans: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Scrub costPrice if not ADMIN
    const sanitized = products.map((p) => {
      if (req.user?.role !== 'ADMIN') {
        const { costPrice, ...rest } = p;
        return rest;
      }
      return p;
    });

    return res.status(200).json({ success: true, data: sanitized });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const { name, type = 'SERVICE', description, salesPrice = 0, costPrice = 0 } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: { message: 'Product name is required' } });
    }

    const product = await prisma.product.create({
      data: {
        name,
        type,
        description,
        salesPrice: parseFloat(salesPrice),
        costPrice: parseFloat(costPrice),
        status: 'ACTIVE'
      }
    });

    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

// --- VARIANTS ---
export async function createVariant(req, res, next) {
  try {
    const { productId, name, sku, priceAdjustment = 0 } = req.body;
    if (!productId || !name) {
      return res.status(400).json({ success: false, error: { message: 'ProductId and name are required' } });
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name,
        sku,
        priceAdjustment: parseFloat(priceAdjustment),
        status: 'ACTIVE'
      }
    });

    return res.status(201).json({ success: true, data: variant });
  } catch (err) {
    next(err);
  }
}

// --- PLANS ---
export async function listPlans(req, res, next) {
  try {
    const plans = await prisma.plan.findMany({
      include: {
        product: true,
        planAddOns: { include: { addOn: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
}

export async function createPlan(req, res, next) {
  try {
    const { productId, name, description, billingInterval = 'MONTHLY', price = 0, minQuantity = 1 } = req.body;
    if (!productId || !name) {
      return res.status(400).json({ success: false, error: { message: 'ProductId and plan name are required' } });
    }

    const plan = await prisma.plan.create({
      data: {
        productId,
        name,
        description,
        billingInterval: billingInterval.toUpperCase(),
        price: parseFloat(price),
        minQuantity: parseInt(minQuantity, 10),
        status: 'ACTIVE'
      },
      include: { product: true }
    });

    return res.status(201).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
}

// --- ADD-ONS ---
export async function listAddOns(req, res, next) {
  try {
    const addOns = await prisma.addOn.findMany({ where: { status: 'ACTIVE' } });
    return res.status(200).json({ success: true, data: addOns });
  } catch (err) {
    next(err);
  }
}

export async function createAddOn(req, res, next) {
  try {
    const { name, description, price = 0 } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: { message: 'Name is required' } });
    }

    const addOn = await prisma.addOn.create({
      data: { name, description, price: parseFloat(price), status: 'ACTIVE' }
    });

    return res.status(201).json({ success: true, data: addOn });
  } catch (err) {
    next(err);
  }
}

// --- TAXES ---
export async function listTaxes(req, res, next) {
  try {
    const taxes = await prisma.tax.findMany({ orderBy: { createdAt: 'desc' } });
    return res.status(200).json({ success: true, data: taxes });
  } catch (err) {
    next(err);
  }
}

export async function createTax(req, res, next) {
  try {
    const { name, rate, isDefault = false } = req.body;
    if (!name || rate === undefined) {
      return res.status(400).json({ success: false, error: { message: 'Name and rate are required' } });
    }

    if (isDefault) {
      // Unset previous defaults
      await prisma.tax.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    const tax = await prisma.tax.create({
      data: {
        name,
        rate: parseFloat(rate),
        isDefault: Boolean(isDefault),
        status: 'ACTIVE'
      }
    });

    return res.status(201).json({ success: true, data: tax });
  } catch (err) {
    next(err);
  }
}

// --- DISCOUNTS ---
export async function listDiscounts(req, res, next) {
  try {
    const discounts = await prisma.discount.findMany({ orderBy: { createdAt: 'desc' } });
    return res.status(200).json({ success: true, data: discounts });
  } catch (err) {
    next(err);
  }
}

export async function createDiscount(req, res, next) {
  try {
    const { code, description, type = 'PERCENTAGE', value = 0, minPurchase = 0, maxUses = 100 } = req.body;
    if (!code || value === undefined) {
      return res.status(400).json({ success: false, error: { message: 'Discount code and value are required' } });
    }

    const discount = await prisma.discount.create({
      data: {
        code: code.trim().toUpperCase(),
        description,
        type: type.toUpperCase(),
        value: parseFloat(value),
        minPurchase: parseFloat(minPurchase),
        maxUses: parseInt(maxUses, 10),
        status: 'ACTIVE'
      }
    });

    return res.status(201).json({ success: true, data: discount });
  } catch (err) {
    next(err);
  }
}
