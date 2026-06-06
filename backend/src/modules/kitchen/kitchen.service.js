const kitchenRepository = require('./kitchen.repository');

class KitchenService {
  async fetchActiveQueue() {
    return kitchenRepository.getActiveOrders();
  }

  async changeStatus(orderId, newStatus) {
    // strict transition validation can go here
    const kOrder = await kitchenRepository.findKitchenOrderByOrderId(orderId);
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
}

module.exports = new KitchenService();
