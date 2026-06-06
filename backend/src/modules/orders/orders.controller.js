const ordersService = require('./orders.service');

class OrdersController {
  async createDiningOrder(req, res, next) {
    try {
      const orderData = {
        ...req.body,
        userId: req.user.id
      };

      const order = await ordersService.placeDiningOrder(orderData);

      // Real-Time System (Phase 7)
      if (req.io) {
        req.io.emit('new_dining_order', order);
        req.io.emit('kitchen_queue_updated', { timestamp: Date.now() });
        req.io.emit('table_status_changed', { tableId: order.tableId, status: 'Occupied' });
      }

      res.status(201).json({ success: true, message: 'Dining order sent to kitchen', data: order });
    } catch (error) {
      next(error);
    }
  }

  async getRunningOrders(req, res, next) {
    try {
      const orders = await ordersService.getRunningOrders();
      res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrdersController();
