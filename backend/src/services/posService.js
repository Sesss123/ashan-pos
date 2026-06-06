const prisma = require('../config/db');

class PosService {
  async createOrder(data) {
    const { branchId, userId, customerId, type, items, subtotal, taxAmount, discountAmount, serviceCharge, total } = data;

    // Database transaction to ensure atomicity
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create the Order
      const newOrder = await tx.order.create({
        data: {
          branchId, userId, customerId, type, status: 'Completed',
          subtotal, taxAmount, discountAmount, serviceCharge, total,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal
            }))
          }
        },
        include: { items: true }
      });

      // 2. Reduce Inventory Stock
      for (const item of items) {
        const stock = await tx.stockItem.findFirst({
          where: { branchId, productId: item.productId }
        });
        if (stock) {
          await tx.stockItem.update({
            where: { id: stock.id },
            data: { quantity: stock.quantity - item.quantity }
          });
        }
      }

      // 3. Create Kitchen Order if Dining/Takeaway
      if (type === 'Dining' || type === 'Takeaway') {
        await tx.kitchenOrder.create({
          data: { orderId: newOrder.id, branchId }
        });
      }

      // 4. Update Customer Wallet/Points if applicable
      if (customerId) {
        const pointsEarned = Math.floor(total / 10); // Example rule: 1 point per $10
        await tx.customerPoint.update({
          where: { customerId },
          data: { points: { increment: pointsEarned }, lifetimePoints: { increment: pointsEarned } }
        });
      }

      return newOrder;
    });

    return order;
  }

  async getRecentOrders(branchId, limit = 50) {
    return await prisma.order.findMany({
      where: { branchId, isDeleted: false },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}

module.exports = new PosService();
