const posRepository = require('./pos.repository');

class PosService {
  async processOrder(orderData) {
    if (orderData.total <= 0) {
      throw new Error('Order total must be greater than zero');
    }
    const order = await posRepository.createOrderWithTransaction(orderData);
    return order;
  }

  async checkoutTable(tableId, checkoutData) {
    return posRepository.checkoutTableWithTransaction(tableId, checkoutData);
  }

  async getPaginatedHistory(page = 1, limit = 50, user) {
    const skip = (page - 1) * limit;
    const orders = await posRepository.getOrders(skip, limit, user);
    return orders;
  }

  async refundOrder(orderId) {
    return posRepository.refundOrder(orderId);
  }

  async getTables(user) {
    return posRepository.getTables(user);
  }

  async searchCustomers(query) {
    return posRepository.searchCustomers(query);
  }

  async getCustomerById(id) {
    return posRepository.getCustomerById(id);
  }

  // --- Customer Credit ---
  async addCustomerCredit(customerId, amount, type, notes) {
    return posRepository.addCustomerCredit(customerId, amount, type, notes);
  }

  async getCustomerCreditHistory(customerId) {
    return posRepository.getCustomerCreditHistory(customerId);
  }

  async getReceipts(filters, user) {
    return posRepository.getReceipts(filters, user);
  }

  async getReceiptById(id) {
    return posRepository.getReceiptById(id);
  }

  async getCurrentShift(userId) {
    return posRepository.getCurrentShift(userId);
  }

  async createShift(userId, openingCash) {
    return posRepository.createShift(userId, openingCash);
  }

  async closeShift(shiftId, actualCash) {
    return posRepository.closeShift(shiftId, actualCash);
  }
}

module.exports = new PosService();
