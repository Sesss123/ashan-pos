import { Router } from 'express';
const { getInventoryDashboard, adjustStock, getInventoryTimeline, getPurchaseOrders, createItem, updateItem, deleteItem, transferStock } = require('../controllers/inventoryController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = Router();

router.use(authenticate);

router.get('/dashboard', getInventoryDashboard);
router.post('/adjust', adjustStock);
router.get('/timeline', getInventoryTimeline);
router.get('/purchase-orders', getPurchaseOrders);

router.post('/transfer', transferStock);

// CRUD
router.post('/items', createItem);
router.put('/items/:id', updateItem);
router.delete('/items/:id', deleteItem);

export default router;
