const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { validateDTO, authenticateToken } = require('../../shared/middlewares/security');
const { loginSchema } = require('../../shared/validators/dtos');

// POST /api/v1/auth/login
router.post('/login', validateDTO(loginSchema), authController.login);

// POST /api/v1/auth/logout
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
