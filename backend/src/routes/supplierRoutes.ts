import { Router } from 'express';
const { 
  createSupplier, 
  getSuppliers, 
  createPurchaseOrder, 
  editPurchaseOrder,
  approveRejectPurchaseOrder,
  emailPurchaseOrder,
  receiveGoods,
  receivePurchaseOrder,
  getPurchaseOrderPdf,
  getAutoReorderSuggestions,
  getPriceComparisonHistory,
  getSupplierPerformanceMetrics
} = require('../controllers/supplierController');
const { authenticateToken } = require('../shared/middlewares/security');

const router = Router();

router.use(authenticateToken);

// Supplier Routes
router.post('/suppliers', createSupplier);
router.get('/suppliers', getSuppliers);
router.get('/suppliers/metrics', getSupplierPerformanceMetrics);

// Purchase Order Routes
router.get('/purchase-orders/reorder-suggestions', getAutoReorderSuggestions);
router.get('/purchase-orders/price-history/:itemId', getPriceComparisonHistory);
router.post('/purchase-orders', createPurchaseOrder);
router.put('/purchase-orders/:id', editPurchaseOrder);
router.put('/purchase-orders/:id/status', approveRejectPurchaseOrder);
router.post('/purchase-orders/:id/email', emailPurchaseOrder);
router.post('/purchase-orders/:id/receive-goods', receiveGoods);
router.get('/purchase-orders/:id/pdf', getPurchaseOrderPdf);

// Legacy full receiving route (backwards compat)
router.put('/purchase-orders/:id/receive', receivePurchaseOrder);

export default router;
