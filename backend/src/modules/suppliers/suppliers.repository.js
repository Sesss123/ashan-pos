const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SupplierRepository {
  async completePurchaseOrder(orderId) {
    return prisma.$transaction(async (tx) => {
      // 1. Update PO Status
      const order = await tx.purchaseOrder.update({
        where: { id: orderId },
        data: { status: 'Completed' },
        include: { items: true }
      });

      // 2. ERP Business Logic: Restock Inventory
      for (const item of order.items) {
        // Find mapping between PO Item Name and Inventory Item
        const inventoryItem = await tx.inventoryItem.findFirst({
          where: { name: item.itemName }
        });

        if (inventoryItem) {
          // Increase stock
          await tx.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: { quantity: { increment: item.quantity } }
          });

          // Log IN movement
          await tx.inventoryMovement.create({
            data: {
              itemId: inventoryItem.id,
              type: 'IN',
              quantity: item.quantity
            }
          });
        }
      }

      return order;
    });
  }
}

module.exports = new SupplierRepository();
