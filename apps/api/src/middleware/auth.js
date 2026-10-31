import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import prisma from '../config/db.js';

/**
 * Verifies JWT Bearer token and loads authenticated user.
 */
export async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication token required' }
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User belonging to token no longer exists' }
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_INACTIVE', message: `Account is ${user.status.toLowerCase()}` }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Session expired, please log in again' }
      });
    }
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' }
    });
  }
}

/**
 * Restricts access to specified roles.
 * Example: requireRole(['ADMIN', 'FINANCE'])
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Role ${req.user.role} is not authorized for this operation`
        }
      });
    }

    next();
  };
}
