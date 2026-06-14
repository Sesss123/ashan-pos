import { Router } from 'express';
const router = Router();
const authController = require('./auth.controller');
const { validateDTO, authenticateToken } = require('../../shared/middlewares/security');
const { loginSchema } = require('../../shared/validators/dtos');

import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per `window`
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, validateDTO(loginSchema), authController.login);

// POST /api/v1/auth/logout
router.post('/logout', authenticateToken, authController.logout);

// POST /api/v1/auth/register (SaaS Onboarding)
router.post('/register', authLimiter, authController.register);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', authLimiter, authController.forgotPassword);

// POST /api/v1/auth/reset-password
router.post('/reset-password', authController.resetPassword);

export default router;
