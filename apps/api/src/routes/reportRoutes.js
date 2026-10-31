import { Router } from 'express';
import {
  getDashboard,
  getKanban,
  listQuarterlyReports,
  createQuarterlyReport
} from '../controllers/reportController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(requireRole(['ADMIN', 'FINANCE']));

router.get('/dashboard', getDashboard);
router.get('/due-date-kanban', getKanban);
router.get('/quarterly', listQuarterlyReports);
router.post('/quarterly', createQuarterlyReport);

export default router;
