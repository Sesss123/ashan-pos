var { PrismaClient } = require('@prisma/client');
const prisma = require('../../config/db').default || require('../../config/db');

class PosRepository {
  async createOrderWithTransaction(orderData) {
    return prisma.$transaction(async (tx) => {
      // 1. Create Order
      const order = await tx.order.create({
        data: {
          tenantId: orderData.tenantId, // Assuming passed from controller or middleware
          userId: orderData.userId,
          branchId: orderData.branchId, // Added branchId
          type: orderData.type,
          status: orderData.paymentMethod ? 'Completed' : 'Pending',
          total: orderData.total,
          subtotal: orderData.subtotal,
          taxAmount: orderData.tax,
          serviceCharge: orderData.serviceCharge,
          discountAmount: orderData.discount,
          deliveryAddress: orderData.deliveryAddress,
          customerId: orderData.customerId,
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
        if (orderData.payments && Array.isArray(orderData.payments) && orderData.payments.length > 0) {
          // SPLIT PAYMENTS
          for (const p of orderData.payments) {
            if (p.method === 'Credit') {
              if (!orderData.customerId) throw new Error('Customer ID is required for Credit payments');
              const customer = await tx.customer.findUnique({ where: { id: orderData.customerId } });
              if (!customer || customer.credit < p.amount) throw new Error('Insufficient customer credit');
              
              await tx.customer.update({
                where: { id: orderData.customerId },
                data: { credit: { decrement: p.amount } }
              });
              await tx.customerCreditHistory.create({
                data: {
                  customerId: orderData.customerId,
                  amount: p.amount,
                  type: 'DECREASE',
                  notes: `Paid for Order ${order.id}`
                }
              });
            }
            await tx.payment.create({
              data: {
                orderId: order.id,
                amount: p.amount,
                method: p.method
              }
            });
          }
        } else {
          // SINGLE PAYMENT
          if (orderData.paymentMethod === 'Credit') {
            if (!orderData.customerId) throw new Error('Customer ID is required for Credit payments');
            const customer = await tx.customer.findUnique({ where: { id: orderData.customerId } });
            if (!customer || customer.credit < orderData.total) throw new Error('Insufficient customer credit');
            
            await tx.customer.update({
              where: { id: orderData.customerId },
              data: { credit: { decrement: orderData.total } }
            });
            await tx.customerCreditHistory.create({
              data: {
                customerId: orderData.customerId,
                amount: orderData.total,
                type: 'DECREASE',
                notes: 'Paid for Order'
              }
            });
          }

          await tx.payment.create({
            data: {
              orderId: order.id,
              amount: orderData.total,
              method: orderData.paymentMethod
            }
          });
        }

        await tx.receipt.create({
          data: {
            orderId: order.id,
            receiptNo: `REC-${Date.now()}`
          }
        });
      }

      // 3. ERP Business Logic: Deduct Inventory & KDS Sync
      let requiresKitchen = false;
      
      for (const item of orderData.items) {
        const product = await tx.product.findUnique({ 
          where: { id: item.productId },
          include: { ingredients: true }
        });
        
        if (product) {
          if (product.requiresKitchen) {
            requiresKitchen = true;
          } else {
            // Deduct immediately since it won't go to KDS
            if (product.ingredients && product.ingredients.length > 0) {
              // Deduct BOM
              for (const ingredient of product.ingredients) {
                const deductQty = ingredient.quantityNeeded * item.quantity;
                await tx.inventoryItem.update({
                  where: { id: ingredient.inventoryItemId },
                  data: { quantity: { decrement: deductQty } }
                });
                await tx.inventoryMovement.create({
                  data: { itemId: ingredient.inventoryItemId, type: 'OUT', quantity: deductQty }
                });
              }
            } else {
              // 1:1 Mapping fallback
              const inventoryItem = await tx.inventoryItem.findFirst({ where: { name: product.name } });
              if (inventoryItem) {
                await tx.inventoryItem.update({
                  where: { id: inventoryItem.id },
                  data: { quantity: { decrement: item.quantity } }
                });
                await tx.inventoryMovement.create({
                  data: { itemId: inventoryItem.id, type: 'OUT', quantity: item.quantity }
                });
              }
            }
          }
        }
      }

      if (requiresKitchen) {
        await tx.kitchenOrder.create({
          data: {
            orderId: order.id,
            status: 'Pending'
          }
        });
        // We will emit the socket event in the controller
        order.requiresKitchenEmit = true; // flag for controller
      }

      return order;
    });
  }

  async checkoutTableWithTransaction(tableId, checkoutData) {
    return prisma.$transaction(async (tx) => {
      // 1. Find all active TableOrders for this table
      const tableOrders = await tx.tableOrder.findMany({
        where: { tableId, status: 'Active' },
        include: { order: { include: { items: true } } }
      });

      if (tableOrders.length === 0) {
        throw new Error('No active orders found for this table');
      }

      const totalAmount = tableOrders.reduce((sum, to) => sum + to.order.total, 0);

      // 2. Create Payments and Receipt
      const primaryOrderId = tableOrders[0].orderId;

      if (checkoutData.payments && Array.isArray(checkoutData.payments) && checkoutData.payments.length > 0) {
        // SPLIT BILLS logic
        for (const p of checkoutData.payments) {
          if (p.method === 'Credit') {
            if (!checkoutData.customerId) throw new Error('Customer ID is required for Credit payments');
            const customer = await tx.customer.findUnique({ where: { id: checkoutData.customerId } });
            if (!customer || customer.credit < p.amount) throw new Error('Insufficient customer credit');
            
            await tx.customer.update({
              where: { id: checkoutData.customerId },
              data: { credit: { decrement: p.amount } }
            });
            await tx.customerCreditHistory.create({
              data: {
                customerId: checkoutData.customerId,
                amount: p.amount,
                type: 'DECREASE',
                notes: `Paid for Table ${tableId} Checkout (Split)`
              }
            });
          }

          await tx.payment.create({
            data: {
              orderId: primaryOrderId,
              amount: p.amount,
              method: p.method
            }
          });
        }
      } else {
        // Fallback single payment
        const method = checkoutData.paymentMethod || 'Cash';
        if (method === 'Credit') {
          if (!checkoutData.customerId) throw new Error('Customer ID is required for Credit payments');
          const customer = await tx.customer.findUnique({ where: { id: checkoutData.customerId } });
          if (!customer || customer.credit < totalAmount) throw new Error('Insufficient customer credit');
          
          await tx.customer.update({
            where: { id: checkoutData.customerId },
            data: { credit: { decrement: totalAmount } }
          });
          await tx.customerCreditHistory.create({
            data: {
              customerId: checkoutData.customerId,
              amount: totalAmount,
              type: 'DECREASE',
              notes: `Paid for Table ${tableId} Checkout`
            }
          });
        }

        await tx.payment.create({
          data: {
            orderId: primaryOrderId,
            amount: totalAmount,
            method: method
          }
        });
      }

      const receipt = await tx.receipt.create({
        data: {
          orderId: primaryOrderId,
          receiptNo: `REC-${Date.now()}`
        }
      });

      // 3. Update all associated Orders and TableOrders
      for (const to of tableOrders) {
        await tx.order.update({
          where: { id: to.orderId },
          data: { status: 'Completed' }
        });
        await tx.tableOrder.update({
          where: { id: to.id },
          data: { status: 'Closed' }
        });
        
        // Clean up Zombie Kitchen Tickets
        const activeKitchenOrder = await tx.kitchenOrder.findFirst({
          where: { orderId: to.orderId, status: { in: ['Pending', 'Preparing', 'Ready'] } }
        });
        if (activeKitchenOrder) {
          await tx.kitchenOrder.update({
            where: { id: activeKitchenOrder.id },
            data: { status: 'Completed' }
          });
        }
      }

      // 4. Free the table
      const table = await tx.table.update({
        where: { id: tableId },
        data: { status: 'Available' }
      });

      return { receipt, totalAmount, tableOrders };
    });
  }

  async getOrders(skip, take, user) {
    const where: any = {};
    if (user && user.role !== 'Admin' && user.branchId) {
      where.branchId = user.branchId;
    }

    return prisma.order.findMany({
      where,
      skip,
      take,
      include: { items: true, payments: true, receipts: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async refundOrder(orderId) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payments: true }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'Refunded') {
        throw new Error('Order is already refunded');
      }

      if (order.status !== 'Completed') {
        throw new Error('Only completed orders can be refunded');
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'Refunded' },
        include: { items: true, payments: true }
      });

      // Optionally, here you could also:
      // 1. Revert customer credit if they paid via credit
      // 2. Adjust shift stats (decrement totals)
      // 3. Re-add inventory stock

      return updatedOrder;
    });
  }

  // --- Table Management ---
  async getTables(user) {
    const where: any = {};
    if (user && user.role !== 'Admin' && user.branchId) {
      where.branchId = user.branchId;
    }
    return prisma.table.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  // --- Customer Management ---
  async searchCustomers(query) {
    return prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { phone: { contains: query } }
        ]
      },
      take: 10
    });
  }

  async getCustomerById(id) {
    return prisma.customer.findUnique({ where: { id } });
  }

  // --- Customer Credit ---
  async addCustomerCredit(customerId, amount, type, notes) {
    return prisma.$transaction(async (tx) => {
      const history = await tx.customerCreditHistory.create({
        data: { customerId, amount, type, notes }
      });
      
      const multiplier = type === 'ADD' ? 1 : -1;
      await tx.customer.update({
        where: { id: customerId },
        data: { credit: { increment: amount * multiplier } }
      });
      
      return history;
    });
  }

  async getCustomerCreditHistory(customerId) {
    return prisma.customerCreditHistory.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' }
    });
  }

  // --- Receipt History ---
  async getReceipts(filters, user) {
    let whereClause: any = {};
    if (filters.dateRange === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      whereClause.createdAt = { gte: start };
    }
    
    // Add branch isolation
    if (user && user.role !== 'Admin' && user.branchId) {
      whereClause.order = {
        branchId: user.branchId
      };
    }

    // Simple mock logic for other filters...
    return prisma.receipt.findMany({
      where: whereClause,
      include: {
        order: {
          include: { items: true, payments: true, user: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  async getReceiptById(id) {
    return prisma.receipt.findUnique({
      where: { id },
      include: {
        order: {
          include: { items: { include: { product: true } }, payments: true, user: true }
        }
      }
    });
  }

  // --- Daily Closing (Shifts) ---
  async getCurrentShift(userId) {
    const shift = await prisma.shift.findFirst({
      where: { userId, status: 'OPEN' },
      include: { user: true }
    });
    
    if (!shift) return null;

    // Dynamically calculate shift stats
    const payments = await prisma.payment.findMany({
      where: {
        order: { userId },
        createdAt: { gte: shift.startTime }
      }
    });

    const orders = await prisma.order.findMany({
      where: {
        userId,
        status: 'Completed',
        createdAt: { gte: shift.startTime }
      }
    });

    let cashPayments = 0, cardPayments = 0, creditSales = 0;
    payments.forEach(p => {
      if (p.method === 'Cash') cashPayments += p.amount;
      else if (p.method === 'Card') cardPayments += p.amount;
      else if (p.method === 'Credit') creditSales += p.amount;
    });

    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
    const taxCollected = orders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
    const discountTotal = orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
    
    const expectedCash = shift.openingCash + cashPayments;

    return {
      ...shift,
      totalOrders: orders.length,
      totalSales,
      cashPayments,
      cardPayments,
      creditSales,
      taxCollected,
      discountTotal,
      expectedCash
    };
  }

  async createShift(userId, openingCash) {
    return prisma.shift.create({
      data: {
        userId,
        openingCash,
        status: 'OPEN'
      }
    });
  }

  async closeShift(shiftId, actualCash) {
    const shiftInfo = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shiftInfo) throw new Error("Shift not found");

    // Recalculate precisely
    const currentStats = await this.getCurrentShift(shiftInfo.userId);
    if (!currentStats) throw new Error("Could not calculate shift stats");

    const expected = currentStats.expectedCash;
    const difference = actualCash - expected;

    return prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: 'CLOSED',
        endTime: new Date(),
        actualCash,
        difference,
        totalOrders: currentStats.totalOrders,
        totalSales: currentStats.totalSales,
        cashPayments: currentStats.cashPayments,
        cardPayments: currentStats.cardPayments,
        creditSales: currentStats.creditSales,
        taxCollected: currentStats.taxCollected,
        discountTotal: currentStats.discountTotal,
        expectedCash: currentStats.expectedCash
      }
    });
  }
}

module.exports = new PosRepository();
export {};
