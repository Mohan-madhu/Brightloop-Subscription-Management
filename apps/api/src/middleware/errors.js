export class AppError extends Error {
  constructor(status, code, message, details = []) { super(message); this.status = status; this.code = code; this.details = details; }
}
export function notFound(req, res) { res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}`, details: [] } }); }
export function errorHandler(error, _req, res, _next) {
  if (error instanceof AppError) return res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
  if (error?.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request.', details: error.issues.map(({ path, message }) => ({ path: path.join('.'), message })) } });
  res.locals.logger?.error({ err: error }, 'Unhandled request error');
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', details: [] } });
}
