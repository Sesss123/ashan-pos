const ordersRepository = require('./orders.repository');

class OrdersService {
  async placeDiningOrder(orderData) {
    // Basic service validation
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Order must contain items');
    }

    // Calculate total from items
    const total = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    return ordersRepository.createDiningOrder({ ...orderData, total });
  }

  async getRunningOrders() {
    return ordersRepository.getActiveOrders();
  }
}

module.exports = new OrdersService();
