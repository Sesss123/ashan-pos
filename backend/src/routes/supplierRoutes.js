const express = require('express');
const { createSupplier, getSuppliers, createPurchaseOrder, receivePurchaseOrder } = require('../controllers/supplierController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Supplier Routes
router.post('/suppliers', createSupplier);
router.get('/suppliers', getSuppliers);

// Purchase Order Routes
router.post('/purchase-orders', createPurchaseOrder);
router.put('/purchase-orders/:id/receive', receivePurchaseOrder);

module.exports = router;
