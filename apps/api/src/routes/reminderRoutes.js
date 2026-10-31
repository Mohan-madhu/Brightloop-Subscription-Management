import { Router } from 'express';
import {
  triggerReminder,
  triggerBatchReminders,
  getLogs
} from '../controllers/reminderController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/trigger', authenticate, triggerReminder);
router.post('/batch', authenticate, requireRole(['ADMIN', 'FINANCE']), triggerBatchReminders);
router.get('/logs', authenticate, getLogs);

export default router;
