import { Router } from 'express';
import {
  listProducts,
  createProduct,
  createVariant,
  listPlans,
  createPlan,
  listAddOns,
  createAddOn,
  listTaxes,
  createTax,
  listDiscounts,
  createDiscount
} from '../controllers/catalogController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Public/authenticated plan viewing
router.get('/plans', listPlans);
router.get('/products', authenticate, listProducts);
router.get('/add-ons', authenticate, listAddOns);
router.get('/taxes', authenticate, listTaxes);
router.get('/discounts', authenticate, listDiscounts);

// Admin-only mutation
router.post('/products', authenticate, requireRole(['ADMIN']), createProduct);
router.post('/variants', authenticate, requireRole(['ADMIN']), createVariant);
router.post('/plans', authenticate, requireRole(['ADMIN']), createPlan);
router.post('/add-ons', authenticate, requireRole(['ADMIN']), createAddOn);
router.post('/taxes', authenticate, requireRole(['ADMIN']), createTax);
router.post('/discounts', authenticate, requireRole(['ADMIN']), createDiscount);

export default router;
