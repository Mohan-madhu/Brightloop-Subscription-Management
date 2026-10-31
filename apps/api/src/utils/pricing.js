/**
 * Centralized Pricing Engine for Brightloop Subscription Management.
 * Reused consistently across Quotations, Subscriptions, and Invoices.
 */

export function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates line subtotal:
 * (basePrice + variantAdjustment + sum(addOnPrices)) * quantity
 */
export function calculateLineSubtotal(item) {
  const basePrice = Number(item.basePrice || item.salesPrice || 0);
  const variantAdjustment = Number(item.variantPriceAdjustment || 0);
  const addOnsTotal = Array.isArray(item.addOns)
    ? item.addOns.reduce((sum, a) => sum + Number(a.price || 0), 0)
    : 0;

  const unitPrice = round(basePrice + variantAdjustment + addOnsTotal);
  const quantity = Math.max(1, parseInt(item.quantity || 1, 10));
  const subtotal = round(unitPrice * quantity);

  return {
    unitPrice,
    quantity,
    subtotal
  };
}

/**
 * Evaluates discount eligibility and calculates discount amount.
 * Only 1 discount allowed per invoice/quotation.
 */
export function calculateDiscount(subtotal, totalQuantity, discount) {
  if (!discount || discount.status !== 'ACTIVE') {
    return { discountAmount: 0, appliedDiscount: null };
  }

  // Check expiration if date set
  const now = new Date();
  if (discount.startDate && new Date(discount.startDate) > now) {
    return { discountAmount: 0, appliedDiscount: null };
  }
  if (discount.endDate && new Date(discount.endDate) < now) {
    return { discountAmount: 0, appliedDiscount: null };
  }

  // Check usage limit
  if (discount.maxUses && discount.usedCount >= discount.maxUses) {
    return { discountAmount: 0, appliedDiscount: null };
  }

  // Check min purchase & min quantity
  if (discount.minPurchase && subtotal < discount.minPurchase) {
    return { discountAmount: 0, appliedDiscount: null };
  }
  if (discount.minQuantity && totalQuantity < discount.minQuantity) {
    return { discountAmount: 0, appliedDiscount: null };
  }

  let discountAmount = 0;
  if (discount.type === 'PERCENTAGE') {
    discountAmount = round((subtotal * discount.value) / 100);
  } else if (discount.type === 'FIXED') {
    discountAmount = round(Math.min(discount.value, subtotal));
  }

  return {
    discountAmount: round(discountAmount),
    appliedDiscount: discount
  };
}

/**
 * Calculates complete order / invoice totals.
 * Tax-exclusive pricing with default 18% GST.
 */
export function calculateTotals({ items, discount = null, taxRate = 18.0 }) {
  let subtotal = 0;
  let totalQuantity = 0;

  const calculatedLines = (items || []).map((item) => {
    const line = calculateLineSubtotal(item);
    subtotal += line.subtotal;
    totalQuantity += line.quantity;
    return {
      ...item,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      subtotal: line.subtotal
    };
  });

  subtotal = round(subtotal);

  // Discount calculation
  const { discountAmount, appliedDiscount } = calculateDiscount(subtotal, totalQuantity, discount);

  // Taxable amount cannot be negative
  const taxableAmount = round(Math.max(0, subtotal - discountAmount));

  // Tax calculation (tax-exclusive)
  const rate = Number(taxRate !== undefined && taxRate !== null ? taxRate : 18.0);
  const taxAmount = round((taxableAmount * rate) / 100);

  // Grand total
  const totalAmount = round(taxableAmount + taxAmount);

  return {
    lines: calculatedLines,
    subtotal,
    discountAmount,
    appliedDiscount,
    taxRate: rate,
    taxAmount,
    taxableAmount,
    totalAmount
  };
}
