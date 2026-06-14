const kitchenService = require('./kitchen.service');

class KitchenController {
  async getQueue(req, res, next) {
    try {
      const queue = await kitchenService.fetchActiveQueue();
      res.json({ success: true, data: queue });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const history = await kitchenService.fetchHistoryQueue();
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { orderId, status } = req.body;
      const updatedOrder = await kitchenService.changeStatus(orderId, status);

      // Real-Time System (Phase 7)
      if (req.io) {
        req.io.emit('order.status_changed', { orderId: updatedOrder.orderId, status });
        req.io.emit('kitchen.queue_updated', { timestamp: Date.now() });
        
        if (status === 'Ready') {
          req.io.emit('kitchen.order_ready', { orderId: updatedOrder.orderId, kitchenOrderId: updatedOrder.id });
        }
      }

      res.json({ success: true, message: `Order status updated to ${status}`, data: updatedOrder });
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req, res, next) {
    try {
      const analytics = await kitchenService.getAnalytics();
      res.json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new KitchenController();
