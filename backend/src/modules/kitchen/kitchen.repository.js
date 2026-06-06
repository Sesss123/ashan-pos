const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class KitchenRepository {
  async getActiveOrders() {
    return prisma.kitchenOrder.findMany({
      where: {
        status: { in: ['Pending', 'Preparing', 'Ready'] }
      },
      include: {
        order: {
          include: { items: { include: { product: true } }, table: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async updateOrderStatus(kitchenOrderId, status) {
    return prisma.kitchenOrder.update({
      where: { id: kitchenOrderId },
      data: { status },
      include: { order: true }
    });
  }

  async findKitchenOrderByOrderId(orderId) {
    return prisma.kitchenOrder.findFirst({
      where: { orderId }
    });
  }
}

module.exports = new KitchenRepository();
