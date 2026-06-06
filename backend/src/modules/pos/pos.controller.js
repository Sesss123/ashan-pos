const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createOrder = async (req, res, next) => {
  try {
    const { items, subtotal, taxAmount, discountAmount, serviceCharge, total, type, paymentMethod } = req.body;
    
    // Defaulting to a mock user if req.user is not yet populated by middleware
    const userId = req.user?.id || 'mock-cashier-id';

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          type,
          status: paymentMethod ? 'Completed' : 'Pending',
          total,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: { items: true }
      });

      if (paymentMethod) {
        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            amount: total,
            method: paymentMethod
          }
        });

        await tx.receipt.create({
          data: {
            orderId: newOrder.id,
            receiptNo: `REC-${Date.now()}`
          }
        });
      }

      return newOrder;
    });

    // Real-Time Notification
    if (req.io) {
      req.io.emit('order_created', order);
      req.io.emit('new_notification', { message: `New ${type} order created!` });
    }

    res.status(201).json({ message: 'Order completed', order });
  } catch (error) {
    next(error);
  }
};

const getBillHistory = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
        payments: true,
        receipts: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getBillHistory
};
