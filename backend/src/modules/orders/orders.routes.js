const express = require('express');
const router = express.Router();

router.post('/create', (req, res) => {
  req.io.emit('order_created', { orderDetails: req.body });
  res.json({ message: 'Order created and sent to Kitchen' });
});
router.put('/update', (req, res) => res.json({ message: 'Order updated' }));
router.get('/status', (req, res) => res.json({ message: 'Order status fetched' }));
router.get('/history', (req, res) => res.json({ message: 'Order history fetched' }));

module.exports = router;
