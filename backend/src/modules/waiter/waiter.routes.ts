import { Router } from 'express';
const router = Router();
const waiterController = require('./waiter.controller');
const { authenticateToken, requireRole } = require('../../shared/middlewares/security');

// All Waiter routes require Waiter (or Admin/Cashier) roles
router.use(authenticateToken);
const allowWaiter = requireRole(['Waiter', 'Admin', 'Cashier']);

// Waiter Order Builder / Kitchen integration
router.post('/tables/order', allowWaiter, waiterController.sendToKitchen);
router.get('/orders/running', allowWaiter, waiterController.getRunningOrders);
router.put('/orders/:id/serve', allowWaiter, waiterController.markAsServed);
router.get('/dashboard-stats', allowWaiter, waiterController.getDashboardStats);

// Table operations
router.post('/tables/transfer', allowWaiter, waiterController.transferTable);
router.post('/tables/merge', allowWaiter, waiterController.mergeTables);
router.put('/tables/:id/status', allowWaiter, waiterController.updateTableStatus);
router.post('/tables/:id/request-bill', allowWaiter, waiterController.requestBill);

// Reservations
router.get('/reservations/today', allowWaiter, waiterController.getTodayReservations);
router.post('/reservations/:id/check-in', allowWaiter, waiterController.checkInReservation);

// Void Item
router.put('/orders/:orderId/items/:itemId/void', allowWaiter, waiterController.voidItem);

export default router;
