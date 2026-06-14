const prisma = require('../../config/db').default || require('../../config/db');
const socketEmitter = require('../../realtime/socketEmitter');

class WaiterController {
  // POST /waiter/tables/order
  async sendToKitchen(req, res, next) {
    try {
      let { tableId, branchId, items, subtotal, taxAmount, total } = req.body;
      const waiterId = req.user.id;
      
      // Fallback branchId logic to prevent foreign key errors for 'main-branch'
      if (!branchId || branchId === 'main-branch') {
        branchId = req.user.branchId || null;
      }

      // Check if any item requires kitchen
      const productIds = items.map(i => i.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, requiresKitchen: true }
      });
      const requiresKitchenMap = {};
      products.forEach(p => requiresKitchenMap[p.id] = p.requiresKitchen);
      
      const needsKitchen = items.some(i => requiresKitchenMap[i.productId]);

      const order = await prisma.$transaction(async (tx) => {
        // Check if there is already an active order for this table
        const activeTableOrder = await tx.tableOrder.findFirst({
          where: { tableId, status: 'Active' },
          include: { order: true }
        });

        let currentOrder;

        if (activeTableOrder) {
          // 1. APPEND to existing order
          const existingOrder = activeTableOrder.order;
          
          await tx.orderItem.createMany({
            data: items.map(i => ({
              orderId: existingOrder.id,
              productId: i.productId,
              quantity: i.quantity,
              price: i.unitPrice,
              notes: i.notes || ''
            }))
          });

          const newTotal = existingOrder.total + total;
          const newSubtotal = (existingOrder.subtotal || 0) + subtotal;
          const newTax = (existingOrder.taxAmount || 0) + taxAmount;

          currentOrder = await tx.order.update({
            where: { id: existingOrder.id },
            data: {
              total: newTotal,
              subtotal: newSubtotal,
              taxAmount: newTax,
            },
            include: { items: true }
          });
          
          if (needsKitchen) {
            await tx.kitchenOrder.create({
              data: {
                orderId: existingOrder.id,
                branchId,
                status: 'Pending',
                priority: 'Normal'
              }
            });
          }
        } else {
          // 2. CREATE NEW Order
          currentOrder = await tx.order.create({
            data: {
              tenantId: req.user.tenantId, // Add tenantId support
              userId: waiterId,
              branchId,
              tableId,
              status: 'Pending',
              type: 'Dining',
              total,
              subtotal,
              taxAmount,
              items: {
                create: items.map(i => ({
                  productId: i.productId,
                  quantity: i.quantity,
                  price: i.unitPrice,
                  notes: i.notes || ''
                }))
              }
            },
            include: { items: true }
          });

          await tx.tableOrder.create({
            data: {
              tableId,
              orderId: currentOrder.id,
              waiterId,
              status: 'Active'
            }
          });

          await tx.table.update({
            where: { id: tableId },
            data: { status: 'Occupied' }
          });

          if (needsKitchen) {
            await tx.kitchenOrder.create({
              data: {
                orderId: currentOrder.id,
                branchId,
                status: 'Pending',
                priority: 'Normal'
              }
            });
          }
        }

        return currentOrder;
      });

      // Emit sockets
      socketEmitter.emitToRole(req.io, 'Kitchen', 'kitchen.queue_updated', { branchId });
      socketEmitter.emitToRole(req.io, 'Kitchen', 'kitchen.order_created', { branchId });
      socketEmitter.emitToRole(req.io, 'Waiter', 'table.updated', { tableId, status: 'Occupied' });
      socketEmitter.emitToRole(req.io, 'Cashier', 'order.created', order);
      // Notify Admin dashboard to refresh live stats
      socketEmitter.dashboard.statsUpdated(req.io, { trigger: 'new_order', branchId });
      
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  // GET /waiter/orders/running
  async getRunningOrders(req, res, next) {
    try {
      let { branchId } = req.query;
      
      if (!branchId || branchId === 'main-branch' || branchId === 'global') {
        branchId = req.user.branchId || null;
      }

      const whereClause = branchId ? { branchId } : {};

      const runningOrders = await prisma.kitchenOrder.findMany({
        where: {
          ...whereClause,
          status: { in: ['Pending', 'Preparing', 'Ready'] }
        },
        include: {
          order: {
            include: {
              table: true,
              items: { include: { product: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(runningOrders);
    } catch (error) {
      next(error);
    }
  }

  // PUT /waiter/orders/:id/serve
  async markAsServed(req, res, next) {
    try {
      const { id } = req.params; // this is kitchenOrderId

      const kitchenOrder = await prisma.kitchenOrder.findUnique({ where: { id } });
      if (!kitchenOrder) return res.status(404).json({ success: false, message: 'Kitchen Order not found' });

      await prisma.kitchenOrder.update({
        where: { id },
        data: { status: 'Completed' }
      });

      socketEmitter.emitToRole(req.io, 'Waiter', 'order.updated', { kitchenOrderId: id, status: 'Completed' });
      
      res.json({ success: true, message: 'Order marked as served' });
    } catch (error) {
      next(error);
    }
  }

  // POST /waiter/tables/transfer
  async transferTable(req, res, next) {
    try {
      const { fromTableId, toTableId, orderId } = req.body;
      const waiterId = req.user.id;

      await prisma.$transaction(async (tx) => {
        // Create transfer log
        await tx.tableTransfer.create({
          data: {
            fromTableId,
            toTableId,
            orderId,
            transferredBy: waiterId
          }
        });

        // Update TableOrder
        await tx.tableOrder.updateMany({
          where: { tableId: fromTableId, orderId, status: 'Active' },
          data: { tableId: toTableId }
        });

        // Update Order
        await tx.order.update({
          where: { id: orderId },
          data: { tableId: toTableId }
        });

        // Update tables statuses
        await tx.table.update({ where: { id: fromTableId }, data: { status: 'Available' } });
        await tx.table.update({ where: { id: toTableId }, data: { status: 'Occupied' } });
      });

      socketEmitter.emitToRole(req.io, 'Waiter', 'table.updated', { fromTableId, toTableId });
      socketEmitter.emitToRole(req.io, 'Cashier', 'table.updated', { fromTableId, toTableId });

      res.json({ success: true, message: 'Table transferred successfully' });
    } catch (error) {
      next(error);
    }
  }

  // POST /waiter/tables/merge
  async mergeTables(req, res, next) {
    try {
      const { fromTableId, toTableId, orderId } = req.body;
      // In a simple implementation, just transfer the order from fromTableId to toTableId.
      // And set fromTableId to Available.

      await prisma.$transaction(async (tx) => {
        // Link TableOrder to new table
        await tx.tableOrder.updateMany({
          where: { tableId: fromTableId, orderId, status: 'Active' },
          data: { tableId: toTableId }
        });

        // Update Order
        await tx.order.update({
          where: { id: orderId },
          data: { tableId: toTableId }
        });

        // Free up old table
        await tx.table.update({ where: { id: fromTableId }, data: { status: 'Available' } });
      });

      socketEmitter.emitToRole(req.io, 'Waiter', 'table.updated', { fromTableId, toTableId });
      socketEmitter.emitToRole(req.io, 'Cashier', 'table.updated', { fromTableId, toTableId });

      res.json({ success: true, message: 'Tables merged successfully' });
    } catch (error) {
      next(error);
    }
  }

  // PUT /waiter/tables/:id/status
  async updateTableStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      await prisma.table.update({
        where: { id },
        data: { status }
      });

      socketEmitter.emitToRole(req.io, 'Waiter', 'table.updated', { tableId: id, status });
      socketEmitter.emitToRole(req.io, 'Cashier', 'table.updated', { tableId: id, status });

      res.json({ success: true, message: 'Table status updated' });
    } catch (error) {
      next(error);
    }
  }

  // POST /waiter/tables/:id/request-bill
  async requestBill(req, res, next) {
    try {
      const { id } = req.params;
      const waiterName = req.user.name;

      const table = await prisma.table.findUnique({ where: { id } });
      if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

      // Notify Cashiers
      const message = `Bill requested for ${table.name} by ${waiterName}`;
      
      const notification = await prisma.notification.create({
        data: {
          message,
          category: 'Orders',
          priority: 'High'
        }
      });

      socketEmitter.emitToRole(req.io, 'Cashier', 'notification.created', notification);
      
      // Optionally update table status or emit a specific event
      socketEmitter.emitToRole(req.io, 'Cashier', 'bill.requested', { tableId: id, tableName: table.name });

      res.json({ success: true, message: 'Bill requested successfully' });
    } catch (error) {
      next(error);
    }
  }

  // GET /waiter/reservations/today
  async getTodayReservations(req, res, next) {
    try {
      let branchId = req.user.branchId || null;
      
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date();
      endOfDay.setHours(23,59,59,999);

      const whereClause: any = {
        date: { gte: startOfDay, lte: endOfDay }
      };
      if (branchId) whereClause.branchId = branchId;

      const reservations = await prisma.reservation.findMany({
        where: whereClause,
        orderBy: { date: 'asc' }
      });

      res.json({ success: true, data: reservations });
    } catch (error) {
      next(error);
    }
  }

  // POST /waiter/reservations/:id/check-in
  async checkInReservation(req, res, next) {
    try {
      const { id } = req.params;
      const { tableId } = req.body;

      const reservation = await prisma.reservation.findUnique({ where: { id } });
      if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

      await prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id },
          data: { status: 'CheckedIn', tableId }
        });

        if (tableId) {
          await tx.table.update({
            where: { id: tableId },
            data: { status: 'Occupied' }
          });
        }
      });

      if (tableId) {
        socketEmitter.emitToRole(req.io, 'Waiter', 'table.updated', { tableId, status: 'Occupied' });
        socketEmitter.emitToRole(req.io, 'Cashier', 'table.updated', { tableId, status: 'Occupied' });
      }

      res.json({ success: true, message: 'Checked in successfully' });
    } catch (error) {
      next(error);
    }
  }

  // GET /waiter/dashboard-stats
  async getDashboardStats(req, res, next) {
    try {
      const waiterId = req.user.id;
      
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date();
      endOfDay.setHours(23,59,59,999);

      // Orders Served
      const ordersServed = await prisma.order.count({
        where: {
          userId: waiterId,
          createdAt: { gte: startOfDay, lte: endOfDay }
        }
      });

      // Tables Served
      const tablesServed = await prisma.tableOrder.count({
        where: {
          waiterId: waiterId,
          createdAt: { gte: startOfDay, lte: endOfDay }
        }
      });

      // Sales Generated
      const sales = await prisma.order.aggregate({
        _sum: { total: true },
        where: {
          userId: waiterId,
          createdAt: { gte: startOfDay, lte: endOfDay }
        }
      });

      res.json({
        success: true,
        data: {
          ordersServed,
          tablesServed,
          salesGenerated: sales._sum.total || 0,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /waiter/orders/:orderId/items/:itemId/void
  async voidItem(req, res, next) {
    try {
      const { orderId, itemId } = req.params;

      await prisma.$transaction(async (tx) => {
        const item = await tx.orderItem.findUnique({
          where: { id: itemId },
          include: { product: { include: { ingredients: true } } }
        });
        if (!item) throw new Error('Item not found');

        // Check if Kitchen already started (meaning stock was deducted)
        const kitchenOrder = await tx.kitchenOrder.findFirst({
          where: { orderId: orderId }
        });

        if (kitchenOrder && ['Preparing', 'Ready', 'Completed'].includes(kitchenOrder.status)) {
          if (item.product && item.product.ingredients && item.product.ingredients.length > 0) {
            for (const ingredient of item.product.ingredients) {
              const restoreQty = ingredient.quantityNeeded * item.quantity;
              
              await tx.inventoryItem.update({
                where: { id: ingredient.inventoryItemId },
                data: { quantity: { increment: restoreQty } }
              });

              await tx.inventoryMovement.create({
                data: {
                  itemId: ingredient.inventoryItemId,
                  type: 'IN',
                  quantity: restoreQty,
                  createdAt: new Date()
                }
              });
            }
            
            await tx.auditLog.create({
              data: {
                action: 'STOCK_RESTORE_VOID',
                details: `Stock restored for voided item ${item.product.name} (Qty: ${item.quantity}) on order #${orderId.substring(0,8)}`
              }
            });
          }
        }

        // Delete the item
        await tx.orderItem.delete({
          where: { id: itemId }
        });

        // Update Order totals
        const order = await tx.order.findUnique({
          where: { id: orderId }
        });

        const itemTotal = item.price * item.quantity;
        const newTotal = order.total - itemTotal;
        const newSub = order.subtotal ? order.subtotal - itemTotal : 0;

        await tx.order.update({
          where: { id: orderId },
          data: {
            total: newTotal > 0 ? newTotal : 0,
            subtotal: newSub > 0 ? newSub : 0,
          }
        });
      });

      // Get branchId if needed, or broadcast globally to kitchen/cashier rooms
      socketEmitter.emitToRole(req.io, 'Kitchen', 'kitchen.queue_updated', {});
      socketEmitter.emitToRole(req.io, 'Cashier', 'order.updated', { orderId });
      socketEmitter.emitToRole(req.io, 'Waiter', 'order.updated', { orderId });

      res.json({ success: true, message: 'Item voided successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WaiterController();
export {};
