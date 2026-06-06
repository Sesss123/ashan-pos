const express = require('express');
const router = express.Router();
const posController = require('./pos.controller');
const { validateDTO, authenticateToken, requireRole } = require('../../shared/middlewares/security');
const { createOrderSchema } = require('../../shared/validators/dtos');

// Enforce JWT Authentication for all POS routes
router.use(authenticateToken);

// POST /api/v1/pos/create-sale
// Only Cashiers and Admins can create POS sales
router.post(
  '/create-sale', 
  requireRole(['Cashier', 'Admin']), 
  validateDTO(createOrderSchema), 
  posController.createOrder
);

// GET /api/v1/pos/history
router.get(
  '/history', 
  requireRole(['Cashier', 'Admin', 'Waiter']), 
  posController.getBillHistory
);

module.exports = router;
