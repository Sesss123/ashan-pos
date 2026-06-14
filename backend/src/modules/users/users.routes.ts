import { Router } from 'express';
const router = Router();
const usersController = require('./users.controller');
const { authenticateToken, requireRole } = require('../../shared/middlewares/security');

// All user routes require authentication and Admin role
router.use(authenticateToken);
router.use(requireRole(['Admin']));

router.get('/', usersController.getAllUsers);
router.post('/', usersController.createUser);
router.put('/:id', usersController.updateUser);
router.delete('/:id', usersController.deleteUser);
router.post('/:id/reset-password', usersController.resetPassword);

export default router;
