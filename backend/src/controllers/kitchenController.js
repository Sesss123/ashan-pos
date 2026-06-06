const prisma = require('../config/db');

// Get all active kitchen orders for a branch
const getKitchenOrders = async (req, res) => {
  try {
    const { branchId } = req.query;
    const orders = await prisma.kitchenOrder.findMany({
      where: { 
        branchId,
        status: { in: ['Pending', 'Preparing', 'Ready'] } 
      },
      include: {
        order: {
          include: { items: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch kitchen orders' });
  }
};

// Update Kitchen Order Status (e.g. Pending -> Preparing -> Ready)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const kitchenOrder = await tx.kitchenOrder.update({
        where: { id },
        data: { status }
      });

      // Log the status change
      await tx.kitchenStatusLog.create({
        data: {
          kitchenOrderId: id,
          status,
          changedBy: userId
        }
      });

      return kitchenOrder;
    });

    // Emit Socket.IO Event
    const io = req.app.get('io');
    if (io) {
      io.to(result.branchId).emit('kitchenOrderStatusChanged', result);
    }

    res.json({ message: 'Kitchen order status updated', order: result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update kitchen order status' });
  }
};

module.exports = {
  getKitchenOrders,
  updateOrderStatus
};
