const express = require('express');
const { createOrder, holdOrder, resumeOrder, processSplitPayment, getBillHistory } = require('../controllers/posController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply auth middleware to all POS routes
router.use(authenticate);

// Orders & Billing
router.post('/orders', createOrder);
router.put('/orders/:id/hold', holdOrder);
router.put('/orders/:id/resume', resumeOrder);
router.get('/orders/history', getBillHistory);

// Payments
router.post('/orders/:orderId/split-payment', processSplitPayment);

module.exports = router;
