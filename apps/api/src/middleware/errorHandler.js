export function errorHandler(err, req, res, next) {
  console.error('[API Error]', err);

  // Prisma Unique Constraint Error (e.g. duplicate email, unique key)
  if (err.code === 'P2002') {
    const fields = err.meta?.target || 'field';
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `A record with this ${Array.isArray(fields) ? fields.join(', ') : fields} already exists.`
      }
    });
  }

  // Prisma Record Not Found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested record was not found.'
      }
    });
  }

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred.'
    }
  });
}
