const express = require('express');
const { addProduct, addStock, checkAlerts, getStockList } = require('../controllers/inventoryController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// All inventory routes require authentication
router.use(authenticate);

router.post('/products', addProduct);
router.post('/stock', addStock);
router.get('/stock', getStockList);
router.get('/alerts', checkAlerts);

module.exports = router;
