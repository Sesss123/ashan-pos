const express = require('express');
const router = express.Router();
const ordersController = require('./orders.controller');
const { validateDTO, authenticateToken, requireRole } = require('../../shared/middlewares/security');
const { createDiningOrderSchema } = require('../../shared/validators/dtos');

router.use(authenticateToken);

// POST /api/v1/orders/dining
router.post('/dining', requireRole(['Waiter', 'Admin']), validateDTO(createDiningOrderSchema), ordersController.createDiningOrder);

// GET /api/v1/orders/running
router.get('/running', requireRole(['Waiter', 'Cashier', 'Admin']), ordersController.getRunningOrders);

module.exports = router;
