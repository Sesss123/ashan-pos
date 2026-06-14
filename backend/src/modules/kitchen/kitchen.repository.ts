const prisma = require('../../config/db').default || require('../../config/db');

class KitchenRepository {
  async getActiveOrders() {
    return prisma.kitchenOrder.findMany({
      where: {
        status: { in: ['Pending', 'Preparing', 'Ready'] }
      },
      include: {
        order: {
          include: { 
            items: { 
              where: { product: { requiresKitchen: true } }, 
              include: { 
                product: {
                  include: { category: true }
                } 
              } 
            }, 
            table: true 
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getCompletedOrders() {
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);

    return prisma.kitchenOrder.findMany({
      where: {
        status: { in: ['Completed', 'Cancelled'] },
        updatedAt: { gte: startOfDay }
      },
      include: {
        order: {
          include: { 
            items: { 
              where: { product: { requiresKitchen: true } }, 
              include: { 
                product: {
                  include: { category: true }
                } 
              } 
            }, 
            table: true 
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getAnalytics(startOfDay, endOfDay) {
    const orders = await prisma.kitchenOrder.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay }
      },
      include: { order: true }
    });

    return orders;
  }

  async updateOrderStatus(kitchenOrderId, status) {
    return prisma.$transaction(async (tx) => {
      // 1. Get original kitchen order with items and ingredients
      const kOrder = await tx.kitchenOrder.findUnique({
        where: { id: kitchenOrderId },
        include: { 
          order: { 
            include: { 
              items: { 
                include: { 
                  product: { 
                    include: { 
                      ingredients: true 
                    } 
                  } 
                } 
              } 
            } 
          } 
        }
      });

      if (!kOrder) throw new Error('Kitchen order not found');

      // 2. Deduct inventory ingredients when transitioning to 'Preparing'
      if (kOrder.status === 'Pending' && status === 'Preparing') {
        for (const item of kOrder.order.items) {
          const product = item.product;
          if (product && product.ingredients && product.ingredients.length > 0) {
            for (const ingredient of product.ingredients) {
              const deductQty = ingredient.quantityNeeded * item.quantity;
              
              // Decrement the inventory item stock
              await tx.inventoryItem.update({
                where: { id: ingredient.inventoryItemId },
                data: {
                  quantity: { decrement: deductQty }
                }
              });

              // Create inventory movement
              await tx.inventoryMovement.create({
                data: {
                  itemId: ingredient.inventoryItemId,
                  type: 'OUT',
                  quantity: deductQty,
                  createdAt: new Date()
                }
              });
            }
          }
        }

        // Create an audit log entry for Production Consumption
        await tx.auditLog.create({
          data: {
            action: 'PRODUCTION_CONSUMPTION',
            details: `Production Consumption: Stock ingredients deducted for kitchen order #${kOrder.id.substring(0, 8)} (Order Reference: #${kOrder.orderId.substring(0, 8)}) upon kitchen acceptance.`
          }
        });
      }

      // 3. Update the kitchen order status
      return tx.kitchenOrder.update({
        where: { id: kitchenOrderId },
        data: { status },
        include: { order: true }
      });
    });
  }

  async findKitchenOrderByOrderId(orderId) {
    return prisma.kitchenOrder.findFirst({
      where: { orderId }
    });
  }

  async findKitchenOrderById(id) {
    return prisma.kitchenOrder.findUnique({
      where: { id }
    });
  }
}

module.exports = new KitchenRepository();
