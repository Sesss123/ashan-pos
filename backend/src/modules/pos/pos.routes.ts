import { Router } from 'express';
const router = Router();
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

// POST /api/v1/pos/orders/:id/refund
router.post(
  '/orders/:id/refund',
  requireRole(['Cashier', 'Admin']),
  posController.refundOrder
);

// --- Table Management ---
router.get('/tables', requireRole(['Cashier', 'Admin', 'Waiter']), posController.getTables);
router.post('/tables/:id/checkout', requireRole(['Cashier', 'Admin']), posController.checkoutTable);

// --- Customer Management ---
router.get('/customers/search', requireRole(['Cashier', 'Admin', 'Waiter']), posController.searchCustomers);
router.get('/customers/:id', requireRole(['Cashier', 'Admin', 'Waiter']), posController.getCustomerById);
router.post('/customers', requireRole(['Cashier', 'Admin', 'Waiter']), posController.createCustomer);

// --- Customer Credit Management ---
router.post('/customers/:customerId/credit', requireRole(['Cashier', 'Admin']), posController.addCustomerCredit);
router.get('/customers/:customerId/credit', requireRole(['Cashier', 'Admin']), posController.getCustomerCreditHistory);

// --- Receipt History ---
router.get('/receipts', requireRole(['Cashier', 'Admin']), posController.getReceipts);
router.get('/receipts/:id', requireRole(['Cashier', 'Admin']), posController.getReceiptById);
router.post('/receipts/reprint', requireRole(['Cashier', 'Admin']), posController.reprintReceipt);

// --- Daily Closing ---
router.get('/daily-closing/current', requireRole(['Cashier', 'Admin', 'Waiter']), posController.getDailyClosing);
router.post('/daily-closing/open', requireRole(['Cashier', 'Admin', 'Waiter']), posController.openShift);
router.post('/daily-closing/close', requireRole(['Cashier', 'Admin', 'Waiter']), posController.closeShift);

export default router;
