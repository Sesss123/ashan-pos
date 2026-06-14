import { Router } from 'express';
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  createDeliveryOrder,
  getDeliveryOrders,
  getDeliveryDrivers,
  updateDeliveryStatus
} = require('../controllers/customerDeliveryController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = Router();
router.use(authenticate);

// ── Customer Routes ──────────────────────────────────────────────────────────
router.post('/customers', createCustomer);
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerById);
router.put('/customers/:id', updateCustomer);

// ── Delivery Order Routes ─────────────────────────────────────────────────────
// NOTE: registered at /api/v1/delivery-system/...
router.post('/orders', createDeliveryOrder);
router.get('/orders', getDeliveryOrders);
router.put('/orders/:id/status', updateDeliveryStatus);
router.get('/drivers', getDeliveryDrivers);

export default router;
