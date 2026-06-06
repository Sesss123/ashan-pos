const posRepository = require('./pos.repository');

class PosService {
  async processOrder(orderData) {
    // Basic service-level validation / business logic could go here
    if (orderData.total <= 0) {
      throw new Error('Order total must be greater than zero');
    }

    const order = await posRepository.createOrderWithTransaction(orderData);
    return order;
  }

  async getPaginatedHistory(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const orders = await posRepository.getOrders(skip, limit);
    return orders;
  }
}

module.exports = new PosService();
