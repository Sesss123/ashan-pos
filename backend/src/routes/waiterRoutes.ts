const express = require('express');
const { 
  getTables, 
  createTableOrder, 
  transferTable, 
  mergeTables, 
  getRunningOrders, 
  modifyOrder, 
  getOrderHistory 
} = require('../controllers/waiterController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/tables', getTables);
router.post('/tables/order', createTableOrder);
router.post('/tables/transfer', transferTable);
router.post('/tables/merge', mergeTables);
router.get('/orders/running', getRunningOrders);
router.put('/orders/modify', modifyOrder);
router.get('/orders/history', getOrderHistory);

module.exports = router;
