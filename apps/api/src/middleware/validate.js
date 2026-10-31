import { AppError } from './errors.js';

export function parsePagination(query, { allowedSort = [] } = {}) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const pageSize = query.pageSize === undefined ? 20 : Number(query.pageSize);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new AppError(400, 'VALIDATION_ERROR', 'page must be at least 1 and pageSize must be between 1 and 100.');
  const sortBy = query.sortBy;
  if (sortBy && !allowedSort.includes(sortBy)) throw new AppError(400, 'VALIDATION_ERROR', 'Unsupported sortBy value.');
  if (query.sortOrder && !['asc', 'desc'].includes(query.sortOrder)) throw new AppError(400, 'VALIDATION_ERROR', 'sortOrder must be asc or desc.');
  return { page, pageSize, skip: (page - 1) * pageSize, orderBy: sortBy ? { [sortBy]: query.sortOrder ?? 'asc' } : undefined };
}
