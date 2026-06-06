const posService = require('./pos.service');

class PosController {
  async createOrder(req, res, next) {
    try {
      const orderData = {
        ...req.body,
        userId: req.user.id // Pulled from JWT via security middleware
      };

      const order = await posService.processOrder(orderData);

      // Real-Time System (Phase 7)
      if (req.io) {
        req.io.emit('order_created', order); // Notify Kitchen/Waiters
        req.io.emit('notification', { message: `New ${order.type} order created!` });
      }

      res.status(201).json({ success: true, message: 'Order completed', data: order });
    } catch (error) {
      next(error);
    }
  }

  async getBillHistory(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;

      const orders = await posService.getPaginatedHistory(page, limit);
      res.json({ success: true, data: orders, meta: { page, limit } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PosController();
