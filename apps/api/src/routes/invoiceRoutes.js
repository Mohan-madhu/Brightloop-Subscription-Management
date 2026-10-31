import { Router } from 'express';
import {
  listInvoices,
  getInvoice,
  confirmInvoice,
  cancelInvoice,
  triggerBilling
} from '../controllers/invoiceController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listInvoices);
router.get('/:id', getInvoice);
router.post('/:id/confirm', requireRole(['ADMIN', 'FINANCE']), confirmInvoice);
router.post('/:id/cancel', requireRole(['ADMIN', 'FINANCE']), cancelInvoice);
router.post('/process-due', requireRole(['ADMIN', 'FINANCE']), triggerBilling);

export default router;
