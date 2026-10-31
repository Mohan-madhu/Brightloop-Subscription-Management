import { Router } from 'express';
import { createStaffUser, listUsers, assignMarketing } from '../controllers/userController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Admin only can create staff
router.post('/staff', requireRole(['ADMIN']), createStaffUser);

// Admin and Marketing can list/view users (Marketing filtered to assigned)
router.get('/', requireRole(['ADMIN', 'FINANCE', 'MARKETING']), listUsers);

// Admin only can assign marketing agent
router.post('/assign-marketing', requireRole(['ADMIN']), assignMarketing);

export default router;
