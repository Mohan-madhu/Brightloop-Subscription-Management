import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errors.js';

const Decimal = Prisma.Decimal;
const zero = new Decimal(0);
const roundMoney = (value) => new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
const moneyString = (value) => roundMoney(value).toFixed(2);

function decimal(value, field) {
  try { const result = new Decimal(value); if (result.isNegative()) throw new Error(); return result; }
  catch { throw new AppError(400, 'VALIDATION_ERROR', `${field} must be a non-negative decimal string.`); }
}

function discountAmount(discount, subtotal) {
  const amount = decimal(discount.amount, 'discount.amount');
  const result = discount.kind === 'PERCENTAGE' ? subtotal.mul(amount).div(100) : amount;
  return Decimal.min(result, subtotal);
}

export function selectBestDiscount(candidates, { subtotal, quantity, now = new Date() }) {
  const total = decimal(subtotal, 'subtotal'); const totalQuantity = Number(quantity);
  const eligible = candidates.filter((discount) => {
    if (!discount.active || (discount.startsAt && new Date(discount.startsAt) > now) || (discount.endsAt && new Date(discount.endsAt) < now)) return false;
    if (discount.minimumPurchase && total.lessThan(decimal(discount.minimumPurchase, 'discount.minimumPurchase'))) return false;
    return !(discount.minimumQuantity && totalQuantity < discount.minimumQuantity);
  });
  return eligible.map((discount) => ({ discount, amount: discountAmount(discount, total) })).sort((a, b) => b.amount.comparedTo(a.amount) || String(a.discount.id).localeCompare(String(b.discount.id)))[0]?.discount ?? null;
}

export function calculateQuotationTotals({ lines, discount = null, taxes = [] }) {
  if (!Array.isArray(lines) || lines.length === 0) throw new AppError(400, 'VALIDATION_ERROR', 'At least one quotation line is required.');
  const normalizedLines = lines.map((line, index) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new AppError(400, 'VALIDATION_ERROR', `lines.${index}.quantity must be a positive integer.`);
    const unitPrice = decimal(line.unitPrice, `lines.${index}.unitPrice`); const lineTotal = roundMoney(unitPrice.mul(line.quantity));
    return { ...line, unitPrice: moneyString(unitPrice), lineTotal: moneyString(lineTotal) };
  });
  const subtotal = normalizedLines.reduce((sum, line) => sum.plus(line.lineTotal), zero);
  const selected = discount ? { ...discount, amount: discountAmount(discount, subtotal) } : null;
  const discountTotal = selected?.amount ?? zero; const taxableTotal = roundMoney(subtotal.minus(discountTotal));
  const taxBreakdown = taxes.filter((tax) => tax.active !== false && tax.taxExclusive !== false).map((tax) => {
    const rate = decimal(tax.rate, 'tax.rate'); return { id: tax.id, name: tax.name, rate: moneyString(rate), amount: moneyString(taxableTotal.mul(rate).div(100)) };
  });
  const taxTotal = taxBreakdown.reduce((sum, tax) => sum.plus(tax.amount), zero); const total = roundMoney(taxableTotal.plus(taxTotal));
  return { lines: normalizedLines, subtotal: moneyString(subtotal), discount: selected ? { id: selected.id, code: selected.code, kind: selected.kind, amount: moneyString(discountTotal) } : null, discountTotal: moneyString(discountTotal), taxableTotal: moneyString(taxableTotal), taxes: taxBreakdown, taxTotal: moneyString(taxTotal), total: moneyString(total) };
}
