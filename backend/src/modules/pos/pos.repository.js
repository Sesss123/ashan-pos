const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PosRepository {
  async createOrderWithTransaction(orderData) {
    return prisma.$transaction(async (tx) => {
      // 1. Create Order
      const order = await tx.order.create({
        data: {
          userId: orderData.userId,
          type: orderData.type,
          status: orderData.paymentMethod ? 'Completed' : 'Pending',
          total: orderData.total,
          items: {
            create: orderData.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: { items: true }
      });

      // 2. Create Payment & Receipt if paid
      if (orderData.paymentMethod) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: orderData.total,
            method: orderData.paymentMethod
          }
        });

        await tx.receipt.create({
          data: {
            orderId: order.id,
            receiptNo: `REC-${Date.now()}`
          }
        });
      }

      // 3. ERP Business Logic: Deduct Inventory
      // Assuming 1:1 mapping between Product and InventoryItem for simplicity in POS.
      for (const item of orderData.items) {
        // Find if this product is linked to an inventory item
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product) {
          // Mock inventory deduction (in a real ERP, we'd have a Recipe or BOM mapping)
          const inventoryItem = await tx.inventoryItem.findFirst({ where: { name: product.name } });
          if (inventoryItem) {
            await tx.inventoryItem.update({
              where: { id: inventoryItem.id },
              data: { quantity: { decrement: item.quantity } }
            });

            await tx.inventoryMovement.create({
              data: {
                itemId: inventoryItem.id,
                type: 'OUT',
                quantity: item.quantity
              }
            });
          }
        }
      }

      return order;
    });
  }

  async getOrders(skip, take) {
    return prisma.order.findMany({
      skip,
      take,
      include: { items: true, payments: true, receipts: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new PosRepository();
