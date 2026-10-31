import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { config } from '../config/env.js';
import { validatePassword, hashPassword, comparePassword } from '../utils/password.js';
import { sendActivationEmail, sendPasswordResetEmail } from '../services/emailService.js';

export async function register(req, res, next) {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email, name and password are required' }
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check existing
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'An account with this email address already exists' }
      });
    }

    // Validate password complexity
    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: passCheck.message }
      });
    }

    const passwordHash = await hashPassword(password);

    // Create user in ACTIVE status (or PENDING if strict activation required; default active for immediate usability)
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        isVerified: false
      }
    });

    // Create activation token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.token.create({
      data: {
        userId: user.id,
        type: 'ACTIVATION',
        tokenHash,
        expiresAt
      }
    });

    // Trigger email
    await sendActivationEmail(user, rawToken);

    // Issue JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to activate.',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          isVerified: user.isVerified
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' }
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const match = await comparePassword(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: `Account is ${user.status.toLowerCase()}` }
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          isVerified: user.isVerified
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function activate(req, res, next) {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Token and email are required' }
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const dbToken = await prisma.token.findFirst({
      where: {
        tokenHash,
        type: 'ACTIVATION',
        usedAt: null,
        expiresAt: { gt: new Date() },
        user: { email: email.toLowerCase() }
      },
      include: { user: true }
    });

    if (!dbToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Activation token is invalid or has expired' }
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: dbToken.userId },
        data: { isVerified: true, status: 'ACTIVE' }
      }),
      prisma.token.update({
        where: { id: dbToken.id },
        data: { usedAt: new Date() }
      })
    ]);

    return res.status(200).json({
      success: true,
      message: 'Account activated successfully. You can now log in.'
    });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email is required' }
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    // To prevent email enumeration, return 200 even if user not found
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been dispatched.'
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.token.create({
      data: {
        userId: user.id,
        type: 'RESET',
        tokenHash,
        expiresAt
      }
    });

    await sendPasswordResetEmail(user, rawToken);

    return res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset link has been dispatched.'
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Token, email and newPassword are required' }
      });
    }

    const passCheck = validatePassword(newPassword);
    if (!passCheck.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: passCheck.message }
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const dbToken = await prisma.token.findFirst({
      where: {
        tokenHash,
        type: 'RESET',
        usedAt: null,
        expiresAt: { gt: new Date() },
        user: { email: email.toLowerCase() }
      }
    });

    if (!dbToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Reset token is invalid or has expired' }
      });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: dbToken.userId },
        data: { passwordHash }
      }),
      prisma.token.update({
        where: { id: dbToken.id },
        data: { usedAt: new Date() }
      })
    ]);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You may now log in.'
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        status: req.user.status,
        phone: req.user.phone,
        isVerified: req.user.isVerified
      }
    });
  } catch (err) {
    next(err);
  }
}
