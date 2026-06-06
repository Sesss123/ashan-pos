const express = require('express');
const router = express.Router();

router.get('/orders', (req, res) => res.json({ message: 'KOT orders fetched' }));
router.post('/prepare', (req, res) => {
  req.io.emit('order_preparing', { orderId: req.body.orderId });
  res.json({ message: 'Order marked as preparing' });
});
router.post('/ready', (req, res) => {
  req.io.emit('order_ready', { orderId: req.body.orderId });
  res.json({ message: 'Order marked as ready' });
});
router.post('/complete', (req, res) => res.json({ message: 'Order completed' }));

module.exports = router;
