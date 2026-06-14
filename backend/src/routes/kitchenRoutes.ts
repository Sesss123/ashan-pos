const express = require('express');
const { getKitchenOrders, updateOrderStatus } = require('../controllers/kitchenController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/orders', getKitchenOrders);
router.put('/orders/:id/status', updateOrderStatus);

module.exports = router;
