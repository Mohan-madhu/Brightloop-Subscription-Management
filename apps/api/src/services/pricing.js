import { ZERO, dec, moneyString, roundMoney, sumMoney } from './money.js';

const DISCOUNT_DATE = (value) => (value ? new Date(value).getTime() : null);

function normalizeLine(line, index) {
  const quantity = Number(line.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    const error = new Error(`Line ${index + 1} must have a positive integer quantity.`);
    error.code = 'INVALID_QUANTITY';
    throw error;
  }
  const unitPrice = roundMoney(line.unitPrice);
  if (unitPrice.lt(0)) {
    const error = new Error(`Line ${index + 1} unit price cannot be negative.`);
    error.code = 'INVALID_PRICE';
    throw error;
  }
  return {
    key: line.key ?? line.productId ?? `line-${index + 1}`,
    description: String(line.description ?? '').trim() || `Line ${index + 1}`,
    productId: line.productId ?? null,
    variantId: line.variantId ?? null,
    isAddon: Boolean(line.isAddon),
    quantity,
    unitPrice,
    taxes: (line.taxes ?? []).map((tax) => ({
      name: String(tax.name ?? 'Tax'),
      rate: dec(tax.rate)
    }))
  };
}

function targetMatches(target, line, planId) {
  if (target.planId && target.planId !== planId) return false;
  if (target.productId && target.productId !== line.productId) return false;
  if (target.variantId && target.variantId !== line.variantId) return false;
  return true;
}

export function discountMatchesLines(discount, lines, planId) {
  const targets = discount.targets ?? [];
  if (targets.length === 0) return true;
  return lines.some((line) => targets.some((target) => targetMatches(target, line, planId)));
}

export function discountReduction(discount, subtotal) {
  if (discount.kind === 'PERCENTAGE') {
    return roundMoney(dec(discount.amount).mul(subtotal).div(100));
  }
  return roundMoney(discount.amount);
}

export function isDiscountEligible({ discount, lines, subtotal, quantity, planId, now = new Date(), usageCount = 0 }) {
  if (!discount.active) return false;
  const at = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const startsAt = DISCOUNT_DATE(discount.startsAt);
  const endsAt = DISCOUNT_DATE(discount.endsAt);
  if (startsAt !== null && startsAt > at) return false;
  if (endsAt !== null && endsAt < at) return false;
  if (discount.minimumPurchase !== null && discount.minimumPurchase !== undefined && subtotal.lt(dec(discount.minimumPurchase))) return false;
  if (discount.minimumQuantity !== null && discount.minimumQuantity !== undefined && quantity < discount.minimumQuantity) return false;
  if (discount.usageLimit !== null && discount.usageLimit !== undefined && usageCount >= discount.usageLimit) return false;
  return discountMatchesLines(discount, lines, planId);
}

export function selectDiscount({ discounts, lines, subtotal, quantity, planId, now = new Date(), usageCounts = {} }) {
  const eligible = discounts
    .filter((discount) => isDiscountEligible({ discount, lines, subtotal, quantity, planId, now, usageCount: usageCounts[discount.id] ?? 0 }))
    .map((discount) => {
      const reduction = discountReduction(discount, subtotal);
      return { discount, reduction: reduction.gt(subtotal) ? subtotal : reduction };
    })
    .filter(({ reduction }) => reduction.gt(0));

  eligible.sort((left, right) => {
    if (!left.reduction.eq(right.reduction)) return right.reduction.cmp(left.reduction);
    const leftStart = DISCOUNT_DATE(left.discount.startsAt) ?? -Infinity;
    const rightStart = DISCOUNT_DATE(right.discount.startsAt) ?? -Infinity;
    if (leftStart !== rightStart) return leftStart - rightStart;
    return String(left.discount.code).localeCompare(String(right.discount.code));
  });
  return eligible[0] ?? null;
}

function allocateDiscount(lines, discountTotal) {
  const bases = lines.map((line) => roundMoney(line.unitPrice.mul(line.quantity)));
  const baseTotal = sumMoney(bases);
  if (discountTotal.lte(0) || baseTotal.lte(0)) return lines.map(() => ZERO);

  const allocations = [];
  let allocated = ZERO;
  for (let index = 0; index < lines.length - 1; index += 1) {
    const share = roundMoney(discountTotal.mul(bases[index]).div(baseTotal));
    const bounded = share.gt(bases[index]) ? bases[index] : share;
    allocations.push(bounded);
    allocated = allocated.plus(bounded);
  }
  const lastShare = discountTotal.minus(allocated);
  const boundedLast = lastShare.gt(bases[bases.length - 1]) ? bases[bases.length - 1] : lastShare;
  allocations.push(boundedLast.gt(0) ? boundedLast : ZERO);
  return allocations;
}

/**
 * Shared authoritative pricing engine. Callers supply agreed line prices
 * (subscription agreedPrice or quotation unitPrice); this function never adds
 * a product base price on top of an agreed line price.
 */
export function calculatePricing({ lines, discount = null, planId = null, now = new Date() }) {
  if (!Array.isArray(lines) || lines.length === 0) {
    const error = new Error('At least one billing line is required.');
    error.code = 'EMPTY_LINES';
    throw error;
  }
  const normalized = lines.map(normalizeLine);
  const bases = normalized.map((line) => roundMoney(line.unitPrice.mul(line.quantity)));
  const subtotal = sumMoney(bases);
  const quantity = normalized.reduce((total, line) => total + line.quantity, 0);
  const chosen = discount
    ? (isDiscountEligible({ discount, lines: normalized, subtotal, quantity, planId, now, usageCount: discount.usageCount ?? 0 })
      ? { discount, reduction: discountReduction(discount, subtotal).gt(subtotal) ? subtotal : discountReduction(discount, subtotal) }
      : null)
    : null;
  const discountTotal = chosen ? chosen.reduction : ZERO;
  const allocations = allocateDiscount(normalized, discountTotal);

  const pricedLines = normalized.map((line, index) => {
    const baseAmount = bases[index];
    const discountAmount = allocations[index] ?? ZERO;
    const lineTotal = roundMoney(baseAmount.minus(discountAmount));
    const taxes = line.taxes.map((tax) => ({
      name: tax.name,
      rate: roundMoney(tax.rate),
      amount: roundMoney(lineTotal.mul(tax.rate).div(100))
    }));
    const taxTotal = sumMoney(taxes.map((tax) => tax.amount));
    return {
      ...line,
      baseAmount,
      discountAmount,
      lineTotal,
      taxes,
      taxTotal
    };
  });

  const taxTotal = sumMoney(pricedLines.map((line) => line.taxTotal));
  const total = roundMoney(subtotal.minus(discountTotal).plus(taxTotal));
  return {
    lines: pricedLines,
    subtotal,
    discountTotal,
    taxTotal,
    total,
    quantity,
    discount: chosen
      ? {
          id: chosen.discount.id ?? null,
          code: chosen.discount.code,
          kind: chosen.discount.kind,
          amount: roundMoney(chosen.discount.amount),
          reduction: discountTotal
        }
      : null
  };
}

export function resolveCatalogUnitPrice({ basePrice, variantAdjustment = 0, isAddon = false, addonPrice = null }) {
  const variant = roundMoney(variantAdjustment);
  const price = isAddon && addonPrice !== null && addonPrice !== undefined ? roundMoney(addonPrice) : roundMoney(basePrice);
  return roundMoney(price.plus(variant));
}

export function pricingForApi(result) {
  return {
    subtotal: moneyString(result.subtotal),
    discountTotal: moneyString(result.discountTotal),
    taxTotal: moneyString(result.taxTotal),
    total: moneyString(result.total),
    discount: result.discount
      ? {
          code: result.discount.code,
          kind: result.discount.kind,
          amount: moneyString(result.discount.amount),
          reduction: moneyString(result.discount.reduction)
        }
      : null,
    lines: result.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: moneyString(line.unitPrice),
      baseAmount: moneyString(line.baseAmount),
      discountAmount: moneyString(line.discountAmount),
      lineTotal: moneyString(line.lineTotal),
      taxTotal: moneyString(line.taxTotal),
      taxes: line.taxes.map((tax) => ({ name: tax.name, rate: moneyString(tax.rate), amount: moneyString(tax.amount) }))
    }))
  };
}
