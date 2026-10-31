import { Router } from 'express';
import {
  createSubscription,
  listSubscriptions,
  getSubscription,
  pauseSubscription,
  resumeSubscription,
  closeSubscription
} from '../controllers/subscriptionController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listSubscriptions);
router.post('/', createSubscription);
router.get('/:id', getSubscription);
router.post('/:id/pause', pauseSubscription);
router.post('/:id/resume', resumeSubscription);
router.post('/:id/close', requireRole(['ADMIN', 'FINANCE']), closeSubscription);

export default router;
