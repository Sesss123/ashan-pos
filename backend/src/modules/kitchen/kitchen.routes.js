const express = require('express');
const router = express.Router();
const kitchenController = require('./kitchen.controller');
const { validateDTO, authenticateToken, requireRole } = require('../../shared/middlewares/security');
const { updateKitchenStatusSchema } = require('../../shared/validators/dtos');

router.use(authenticateToken);

// GET /api/v1/kitchen/queue
router.get('/queue', requireRole(['Kitchen', 'Admin']), kitchenController.getQueue);

// PUT /api/v1/kitchen/status
router.put('/status', requireRole(['Kitchen', 'Admin']), validateDTO(updateKitchenStatusSchema), kitchenController.updateStatus);

module.exports = router;
