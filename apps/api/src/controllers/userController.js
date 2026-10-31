import prisma from '../config/db.js';
import { validatePassword, hashPassword } from '../utils/password.js';

export async function createStaffUser(req, res, next) {
  try {
    const { email, password, name, role, phone } = req.body;

    if (!['ADMIN', 'FINANCE', 'MARKETING'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ROLE', message: 'Staff role must be ADMIN, FINANCE, or MARKETING' }
      });
    }

    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: passCheck.message }
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'A user with this email already exists' }
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        role,
        phone: phone ? phone.trim() : null,
        status: 'ACTIVE',
        isVerified: true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Staff user created successfully',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req, res, next) {
  try {
    const { role, search, page = 1, pageSize = 20 } = req.query;
    const where = {};

    // Role restrictions:
    // If Marketing, only show customers assigned to them!
    if (req.user.role === 'MARKETING') {
      where.role = 'CUSTOMER';
      where.assignedMarketingId = req.user.id;
    } else if (role) {
      where.role = role.toUpperCase();
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
    const take = parseInt(pageSize, 10);

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          status: true,
          isVerified: true,
          assignedMarketingId: true,
          marketingAgent: {
            select: { id: true, name: true, email: true }
          },
          createdAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page, 10),
        pageSize: take,
        totalCount,
        totalPages: Math.ceil(totalCount / take)
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function assignMarketing(req, res, next) {
  try {
    const { customerId, marketingId } = req.body;

    const customer = await prisma.user.update({
      where: { id: customerId },
      data: { assignedMarketingId: marketingId },
      include: { marketingAgent: true }
    });

    return res.status(200).json({
      success: true,
      message: 'Customer assigned to marketing agent',
      data: customer
    });
  } catch (err) {
    next(err);
  }
}
