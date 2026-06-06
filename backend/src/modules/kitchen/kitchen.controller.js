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

  async updateStatus(req, res, next) {
    try {
      const { orderId, status } = req.body;
      const updatedOrder = await kitchenService.changeStatus(orderId, status);

      // Real-Time System (Phase 7)
      if (req.io) {
        // Emit specific event based on status for granular client tracking
        req.io.emit(`order_${status.toLowerCase()}`, { orderId: updatedOrder.orderId, status });
        req.io.emit('kitchen_queue_updated', { timestamp: Date.now() });
      }

      res.json({ success: true, message: `Order status updated to ${status}`, data: updatedOrder });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new KitchenController();
