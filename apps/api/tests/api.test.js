import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { login, getMe } from '../src/controllers/authController.js';
import { listPlans, listProducts } from '../src/controllers/catalogController.js';
import { getDashboard } from '../src/controllers/reportController.js';
import prisma from '../src/config/db.js';

function createMockRes() {
  return {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.data = body;
      return this;
    }
  };
}

describe('Controller Handlers Verification', () => {
  let adminUser;

  test('setup admin user', async () => {
    adminUser = await prisma.user.findUnique({ where: { email: 'admin@brightloop.local' } });
    assert.ok(adminUser);
  });

  test('authController.login with valid credentials', async () => {
    const req = {
      body: {
        email: 'admin@brightloop.local',
        password: 'Admin123!@#'
      }
    };
    const res = createMockRes();
    await login(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.data.token);
    assert.equal(res.data.data.user.role, 'ADMIN');
  });

  test('catalogController.listPlans returns active plans', async () => {
    const req = {};
    const res = createMockRes();
    await listPlans(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.data));
    assert.ok(res.data.data.length >= 1);
  });

  test('catalogController.listProducts for admin retains costPrice', async () => {
    const req = { user: adminUser };
    const res = createMockRes();
    await listProducts(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.data.length >= 1);
    assert.ok(res.data.data[0].costPrice !== undefined);
  });

  test('catalogController.listProducts for non-admin strips costPrice', async () => {
    const req = { user: { role: 'CUSTOMER' } };
    const res = createMockRes();
    await listProducts(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.data.length >= 1);
    assert.equal(res.data.data[0].costPrice, undefined, 'Cost price must be scrubbed for non-admin');
  });

  test('reportController.getDashboard returns metrics', async () => {
    const req = { user: adminUser };
    const res = createMockRes();
    await getDashboard(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.data.invoicedRevenue >= 0);
    assert.equal(res.data.data.currency, 'INR');
  });
});
