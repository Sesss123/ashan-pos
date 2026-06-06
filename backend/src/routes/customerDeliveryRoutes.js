const express = require('express');
const { createCustomer, getCustomers, createDeliveryOrder, assignRider, getDeliveryOrders } = require('../controllers/customerDeliveryController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Customer Routes
router.post('/customers', createCustomer);
router.get('/customers', getCustomers);

// Delivery Routes
router.post('/deliveries', createDeliveryOrder);
router.put('/deliveries/:id/assign', assignRider);
router.get('/deliveries', getDeliveryOrders);

module.exports = router;
