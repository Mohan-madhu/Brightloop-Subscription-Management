import { Router } from 'express';
import {
  listTemplates,
  createTemplate,
  listQuotations,
  createQuotation,
  acceptQuotation
} from '../controllers/quotationController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Templates
router.get('/templates', listTemplates);
router.post('/templates', requireRole(['ADMIN', 'MARKETING']), createTemplate);

// Quotations
router.get('/', listQuotations);
router.post('/', requireRole(['ADMIN', 'MARKETING']), createQuotation);
router.post('/:id/accept', acceptQuotation);

export default router;
