import { Prisma } from '@prisma/client';

export const Decimal = Prisma.Decimal;
export const ZERO = new Decimal(0);
export const MONEY_DP = 2;
export const MONEY_ROUNDING = Decimal.ROUND_HALF_UP;
export const MONEY_PATTERN = /^\d{1,12}(?:\.\d{1,2})?$/;

export function dec(value) {
  if (value === null || value === undefined || value === '') return new Decimal(0);
  return value instanceof Decimal ? value : new Decimal(value);
}

export function roundMoney(value) {
  return dec(value).toDecimalPlaces(MONEY_DP, MONEY_ROUNDING);
}

export function moneyString(value) {
  return roundMoney(value).toFixed(2);
}

export function parseMoney(value, field = 'amount') {
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string' || !MONEY_PATTERN.test(text)) {
    const error = new Error(`${field} must be a non-negative decimal string with at most two fraction digits.`);
    error.code = 'INVALID_MONEY';
    throw error;
  }
  return roundMoney(text);
}

export function sumMoney(values) {
  return values.reduce((total, value) => total.plus(dec(value)), ZERO);
}

export function minMoney(...values) {
  return values.map(dec).reduce((lowest, value) => (value.lt(lowest) ? value : lowest));
}

export function maxMoney(...values) {
  return values.map(dec).reduce((highest, value) => (value.gt(highest) ? value : highest));
}
