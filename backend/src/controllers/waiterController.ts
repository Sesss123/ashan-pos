import prisma from '../config/db';

// Get all tables for a branch
const getTables = async (req, res) => {
  try {
    const { branchId } = req.query;
    const tables = await prisma.table.findMany({
      where: { branchId },
      include: {
        orders: {
          where: { status: 'Active' },
          include: { order: { include: { items: true } } }
        }
      }
    });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get tables' });
  }
};

// Create a Table Order
const createTableOrder = async (req, res) => {
  try {
    const { tableId, branchId, items, subtotal, taxAmount, total } = req.body;
    const waiterId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create main Order
      const order = await tx.order.create({
        data: {
          branchId,
          userId: waiterId,
          type: 'Dining',
          status: 'Pending',
          subtotal,
          taxAmount,
          total
        }
      });

      // 2. Add Items
      await tx.orderItem.createMany({
        data: items.map(item => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice
        }))
      });

      // 3. Link Order to Table (TableOrder)
      const tableOrder = await tx.tableOrder.create({
        data: {
          tableId,
          orderId: order.id,
          waiterId
        }
      });

      // 4. Create Kitchen Order
      const kitchenOrder = await tx.kitchenOrder.create({
        data: {
          orderId: order.id,
          branchId,
          status: 'Pending',
          priority: 'Normal'
        }
      });

      // 5. Update Table Status
      await tx.table.update({
        where: { id: tableId },
        data: { status: 'Occupied' }
      });

      return { order, tableOrder, kitchenOrder };
    });

    // Emit Socket.IO Event for Real-time Update
    const io = req.app.get('io');
    if (io) {
      // Global emit for now to ensure delivery across multi-tenant setups without complex room building here
      io.emit('table.updated', { tableId, status: 'Occupied', order: result.order });
      io.emit('kitchen.order_created', result.kitchenOrder);
      io.emit('kitchen.queue_updated', { timestamp: Date.now() });
    }

    res.status(201).json({ message: 'Table order created', result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create table order' });
  }
};

// Transfer Table
const transferTable = async (req, res) => {
  try {
    const { fromTableId, toTableId, orderId } = req.body;
    const waiterId = req.user.id;

    await prisma.$transaction(async (tx) => {
      // 1. Log transfer
      await tx.tableTransfer.create({
        data: { fromTableId, toTableId, orderId, transferredBy: waiterId }
      });

      // 2. Update TableOrder link
      await tx.tableOrder.updateMany({
        where: { tableId: fromTableId, orderId, status: 'Active' },
        data: { tableId: toTableId }
      });

      // 3. Update Table statuses
      await tx.table.update({ where: { id: fromTableId }, data: { status: 'Available' } });
      const toTable = await tx.table.update({ where: { id: toTableId }, data: { status: 'Occupied' } });

      // Emit Socket.IO Event
      const io = req.app.get('io');
      if (io) {
        io.to(toTable.branchId).emit('table.transferred', { fromTableId, toTableId });
      }
    });

    res.json({ message: 'Table transferred successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to transfer table' });
  }
};
// Merge Tables
const mergeTables = async (req, res) => {
  try {
    const { fromTableId, toTableId, orderId } = req.body;
    const waiterId = req.user.id;

    await prisma.$transaction(async (tx) => {
      // 1. Move the table order link
      await tx.tableOrder.updateMany({
        where: { tableId: fromTableId, orderId, status: 'Active' },
        data: { tableId: toTableId }
      });

      // 2. Free up origin table
      await tx.table.update({ where: { id: fromTableId }, data: { status: 'Available' } });

      // Emit Socket.IO Event
      const toTable = await tx.table.findUnique({ where: { id: toTableId } });
      const io = req.app.get('io');
      if (io) {
        io.to(toTable.branchId).emit('table.merged', { fromTableId, toTableId });
      }
    });

    res.json({ message: 'Tables merged successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to merge tables' });
  }
};

// Get Running Orders
const getRunningOrders = async (req, res) => {
  try {
    const { branchId } = req.query;
    const orders = await prisma.kitchenOrder.findMany({
      where: {
        branchId,
        status: { in: ['Pending', 'Preparing', 'Ready'] }
      },
      include: {
        order: {
          include: {
            items: { include: { product: true } },
            tableOrders: { include: { table: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get running orders' });
  }
};

// Modify Order
const modifyOrder = async (req, res) => {
  try {
    const { orderId, newItems } = req.body;
    
    await prisma.$transaction(async (tx) => {
      for (const item of newItems) {
        await tx.orderItem.create({
          data: {
            orderId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
            notes: item.notes
          }
        });
      }
      
      // Emit update
      const io = req.app.get('io');
      if (io) {
        io.emit('order.updated', { orderId });
      }
    });

    res.json({ message: 'Order modified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to modify order' });
  }
};

// Order History
const getOrderHistory = async (req, res) => {
  try {
    const { branchId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        branchId,
        userId: req.user.id,
        createdAt: { gte: today },
        status: { in: ['Completed', 'Cancelled'] }
      },
      include: { items: true, tableOrders: { include: { table: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get order history' });
  }
};

module.exports = {
  getTables,
  createTableOrder,
  transferTable,
  mergeTables,
  getRunningOrders,
  modifyOrder,
  getOrderHistory
};
