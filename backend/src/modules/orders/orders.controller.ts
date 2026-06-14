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
        const tenantId = req.user?.tenantId;
        const tenantPrefix = tenantId ? `tenant:${tenantId}:` : '';
        const branchRoom = req.user?.branchId ? `${tenantPrefix}branch:${req.user.branchId}` : null;
        
        if (branchRoom) {
          req.io.to(branchRoom).emit('order.created', order);
          req.io.to(`${branchRoom}:kitchen`).emit('kitchen.queue_updated', { timestamp: Date.now() });
          req.io.to(branchRoom).emit('table.status_changed', { tableId: order.tableId, status: 'Occupied' });
        } else {
          req.io.to(`${tenantPrefix}room:global`).emit('order.created', order);
          req.io.to(`${tenantPrefix}room:kitchen`).emit('kitchen.queue_updated', { timestamp: Date.now() });
          req.io.to(`${tenantPrefix}room:global`).emit('table.status_changed', { tableId: order.tableId, status: 'Occupied' });
        }
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
