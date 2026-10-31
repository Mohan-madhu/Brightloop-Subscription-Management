import { z } from 'zod';
import { AppError } from '../../middleware/errors.js';
import { parseDateOnly } from '../../services/billing-calendar.js';

export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD.').refine(
  (value) => {
    try {
      parseDateOnly(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Date is not a valid calendar date.' }
);

export function optionalText(query, key, maxLength = 100) {
  const value = query[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || Array.isArray(value)) throw new AppError(400, 'VALIDATION_ERROR', `${key} must be a string.`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new AppError(400, 'VALIDATION_ERROR', `${key} must be at most ${maxLength} characters.`);
  return trimmed || undefined;
}

export function optionalDate(query, key) {
  const value = optionalText(query, key, 10);
  if (value === undefined) return undefined;
  const result = dateString.safeParse(value);
  if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', `${key} must be a valid YYYY-MM-DD date.`);
  return value;
}

export function optionalBoolean(query, key) {
  const value = query[key];
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new AppError(400, 'VALIDATION_ERROR', `${key} must be true or false.`);
}

export function assertDateRange(from, to, label = 'date range') {
  if (from && to && parseDateOnly(from).getTime() > parseDateOnly(to).getTime()) {
    throw new AppError(400, 'VALIDATION_ERROR', `${label} is invalid: the start date is after the end date.`);
  }
}

export function bodyNote(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > 500) throw new AppError(400, 'VALIDATION_ERROR', 'note must be a string of at most 500 characters.');
  return value.trim() || null;
}
