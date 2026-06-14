const kitchenRepository = require('./kitchen.repository');

class KitchenService {
  async fetchActiveQueue() {
    return kitchenRepository.getActiveOrders();
  }

  async fetchHistoryQueue() {
    return kitchenRepository.getCompletedOrders();
  }

  async changeStatus(kitchenOrderId, newStatus) {
    // strict transition validation can go here
    const kOrder = await kitchenRepository.findKitchenOrderById(kitchenOrderId);
    if (!kOrder) throw new Error('Kitchen order not found');

    const validTransitions = {
      'Pending': ['Preparing', 'Cancelled'],
      'Preparing': ['Ready'],
      'Ready': ['Completed'],
      'Completed': []
    };

    if (!validTransitions[kOrder.status].includes(newStatus) && newStatus !== 'Cancelled') {
      throw new Error(`Invalid status transition from ${kOrder.status} to ${newStatus}`);
    }

    return kitchenRepository.updateOrderStatus(kOrder.id, newStatus);
  }

  async getAnalytics() {
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date();
    endOfDay.setHours(23,59,59,999);

    const orders = await kitchenRepository.getAnalytics(startOfDay, endOfDay);
    
    let totalPrepTime = 0;
    let completedOrders = 0;
    let delayedOrders = 0;
    const TARGET_TIME_MS = 15 * 60 * 1000; // 15 mins target

    orders.forEach(o => {
      // If it's ready or completed, we can measure its prep time
      // But we don't have a specific `readyAt` timestamp.
      // Since it's just an MVP, we will mock or approximate prep time from order.updatedAt if available,
      // or we just skip true avg time if we can't track it.
      // Wait, let's just return raw numbers of orders by status.
      if (o.status === 'Ready' || o.status === 'Completed') {
        completedOrders++;
        // Approximation: if (o.order && o.order.updatedAt) - o.createdAt
      }
    });

    return {
      totalOrders: orders.length,
      completedOrders,
      pendingOrders: orders.filter(o => o.status === 'Pending').length,
      preparingOrders: orders.filter(o => o.status === 'Preparing').length,
    };
  }
}

module.exports = new KitchenService();
