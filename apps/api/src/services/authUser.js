import prisma from '../config/db.js';

function normalizeLegacyUser(user) {
  if (!user) return null;
  return {
    ...user,
    name: user.name ?? [user.firstName, user.lastName].filter(Boolean).join(' '),
    role: user.role ?? (user.kind === 'CUSTOMER' ? 'CUSTOMER' : 'STAFF'),
    status: user.status ?? (user.isActive ? 'ACTIVE' : 'PENDING'),
    isVerified: user.isVerified ?? Boolean(user.isActive),
    phone: user.phone ?? null
  };
}

/**
 * Loads a user from either the current foundation schema or the legacy
 * compatibility schema. This keeps authentication usable while deployments
 * transition without changing or resetting the live database.
 */
export async function findAuthUserByEmail(email) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT u.id, u.email, ac."passwordHash" AS "passwordHash",
             concat_ws(' ', u."firstName", u."lastName") AS name,
             CASE WHEN u.kind::text = 'CUSTOMER' THEN 'CUSTOMER'
                  ELSE COALESCE((SELECT r.code FROM "UserRole" ur JOIN "Role" r ON r.id = ur."roleId" WHERE ur."userId" = u.id LIMIT 1), 'STAFF') END AS role,
             CASE WHEN u."isActive" THEN 'ACTIVE' ELSE 'PENDING' END AS status,
             u."isActive" AS "isVerified", NULL::text AS phone
      FROM "User" u
      LEFT JOIN "AuthCredential" ac ON ac."userId" = u.id
      WHERE lower(u.email) = lower(${email})
      LIMIT 1
    `;
    return normalizeLegacyUser(rows[0] ?? null);
  } catch (foundationError) {
    // Older deployments use the legacy Prisma model. Fall back only when the
    // foundation tables are unavailable; do not mask a real database error.
    if (!/does not exist|relation .* not found|column .* does not exist/i.test(String(foundationError?.message))) {
      throw foundationError;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    return normalizeLegacyUser(user);
  }
}

export async function findAuthUserById(id) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT u.id, u.email,
             concat_ws(' ', u."firstName", u."lastName") AS name,
             CASE WHEN u.kind::text = 'CUSTOMER' THEN 'CUSTOMER'
                  ELSE COALESCE((SELECT r.code FROM "UserRole" ur JOIN "Role" r ON r.id = ur."roleId" WHERE ur."userId" = u.id LIMIT 1), 'STAFF') END AS role,
             CASE WHEN u."isActive" THEN 'ACTIVE' ELSE 'PENDING' END AS status,
             u."isActive" AS "isVerified", NULL::text AS phone
      FROM "User" u
      WHERE u.id = ${id}
      LIMIT 1
    `;
    return normalizeLegacyUser(rows[0] ?? null);
  } catch (foundationError) {
    if (!/does not exist|relation .* not found|column .* does not exist/i.test(String(foundationError?.message))) {
      throw foundationError;
    }
    return normalizeLegacyUser(await prisma.user.findUnique({ where: { id } }));
  }
}
