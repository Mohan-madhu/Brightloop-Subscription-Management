import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import catalogRoutes from './catalogRoutes.js';
import quotationRoutes from './quotationRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import reportRoutes from './reportRoutes.js';
import reminderRoutes from './reminderRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'Brightloop Subscription Management API',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/', catalogRoutes); // /products, /plans, /taxes, etc.
router.use('/quotations', quotationRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/reports', reportRoutes);
router.use('/reminders', reminderRoutes);

export default router;
