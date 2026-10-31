import { Router } from 'express';
import { register, login, activate, forgotPassword, resetPassword, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/activate', activate);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);

export default router;
