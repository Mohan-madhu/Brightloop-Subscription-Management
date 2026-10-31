import { Router } from 'express';
import {
  createManualPayment,
  initRazorpayCheckout,
  verifyRazorpayPayment,
  handleWebhook
} from '../controllers/paymentController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Webhook endpoint (unauthenticated, signature checked)
router.post('/webhook', handleWebhook);

// Protected endpoints
router.use(authenticate);

router.post('/manual', requireRole(['ADMIN', 'FINANCE']), createManualPayment);
router.post('/razorpay/create-order', initRazorpayCheckout);
router.post('/razorpay/verify', verifyRazorpayPayment);

export default router;
