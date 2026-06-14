import { Router } from 'express';
const router = Router();
const kitchenController = require('./kitchen.controller');
const { validateDTO, authenticateToken, requireRole } = require('../../shared/middlewares/security');
const { updateKitchenStatusSchema } = require('../../shared/validators/dtos');

router.use(authenticateToken);

// GET /api/v1/kitchen/queue
router.get('/queue', requireRole(['Kitchen', 'Admin']), kitchenController.getQueue);

// GET /api/v1/kitchen/history
router.get('/history', requireRole(['Kitchen', 'Admin']), kitchenController.getHistory);

// PUT /api/v1/kitchen/status
router.put('/status', requireRole(['Kitchen', 'Admin']), validateDTO(updateKitchenStatusSchema), kitchenController.updateStatus);

// GET /api/v1/kitchen/analytics
router.get('/analytics', requireRole(['Kitchen', 'Admin']), kitchenController.getAnalytics);

export default router;
