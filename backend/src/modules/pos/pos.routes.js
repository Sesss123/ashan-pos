const express = require('express');
const router = express.Router();
const posController = require('./pos.controller');

router.post('/create-sale', posController.createOrder);
router.get('/history', posController.getBillHistory);
router.post('/payment', (req, res) => res.json({ message: 'Payment processed' }));
router.post('/daily-closing', (req, res) => res.json({ message: 'Daily closing calculated' }));

module.exports = router;
