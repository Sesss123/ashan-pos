const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class OrdersRepository {
  async createDiningOrder(orderData) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: orderData.userId,
          tableId: orderData.tableId,
          status: 'Pending',
          type: 'Dining',
          total: orderData.total,
          items: {
            create: orderData.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: { items: true, table: true }
      });

      // Update Table Status to Occupied
      if (orderData.tableId) {
        await tx.table.update({
          where: { id: orderData.tableId },
          data: { status: 'Occupied' }
        });
      }

      // Automatically push a KitchenOrder
      await tx.kitchenOrder.create({
        data: {
          orderId: order.id,
          status: 'Pending'
        }
      });

      return order;
    });
  }

  async getActiveOrders() {
    return prisma.order.findMany({
      where: { status: 'Pending', type: 'Dining' },
      include: { items: { include: { product: true } }, table: true, kitchenOrders: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new OrdersRepository();
