const prisma = require('../config/db');

// ---- BRANCH TRANSFERS ----

const createBranchTransfer = async (req, res) => {
  try {
    const { fromBranchId, toBranchId, items, dispatchedBy } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.branchTransfer.create({
        data: {
          fromBranchId, toBranchId, dispatchedBy, status: 'InTransit',
          items: {
            create: items // [{ productId, quantity }]
          }
        },
        include: { items: true }
      });

      // Reduce stock from source branch
      for (const item of items) {
        const stock = await tx.stockItem.findFirst({
          where: { branchId: fromBranchId, productId: item.productId }
        });
        if (stock && stock.quantity >= item.quantity) {
          await tx.stockItem.update({
            where: { id: stock.id },
            data: { quantity: stock.quantity - item.quantity }
          });
        } else {
          throw new Error(`Insufficient stock for product ${item.productId} at source branch`);
        }
      }

      return transfer;
    });

    res.status(201).json({ message: 'Branch transfer initiated', transfer: result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create branch transfer', error: error.message });
  }
};

const receiveBranchTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { receivedBy } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.branchTransfer.findUnique({ where: { id }, include: { items: true } });
      if (!transfer || transfer.status === 'Received') throw new Error('Invalid transfer');

      await tx.branchTransfer.update({
        where: { id },
        data: { status: 'Received', receivedBy }
      });

      // Increase stock at destination branch
      for (const item of transfer.items) {
        const stock = await tx.stockItem.findFirst({
          where: { branchId: transfer.toBranchId, productId: item.productId }
        });
        if (stock) {
          await tx.stockItem.update({
            where: { id: stock.id },
            data: { quantity: stock.quantity + item.quantity }
          });
        } else {
          await tx.stockItem.create({
            data: { branchId: transfer.toBranchId, productId: item.productId, quantity: item.quantity }
          });
        }
      }

      return transfer;
    });

    res.json({ message: 'Branch transfer received successfully', transfer: result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to receive branch transfer', error: error.message });
  }
};

// ---- BRANCH CONFIGURATION ----

const updateBranchConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { taxRate, currency, timezone, isActive } = req.body;

    const branch = await prisma.branch.update({
      where: { id },
      data: { taxRate, currency, timezone, isActive }
    });

    res.json({ message: 'Branch configuration updated', branch });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update branch config', error: error.message });
  }
};

module.exports = {
  createBranchTransfer,
  receiveBranchTransfer,
  updateBranchConfig
};
