const prisma = require('../config/db');

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
      io.to(branchId).emit('tableUpdated', { tableId, status: 'Occupied', order: result.order });
      io.to(branchId).emit('newKitchenOrder', result.kitchenOrder);
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
        io.to(toTable.branchId).emit('tableTransferred', { fromTableId, toTableId });
      }
    });

    res.json({ message: 'Table transferred successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to transfer table' });
  }
};

module.exports = {
  getTables,
  createTableOrder,
  transferTable
};
