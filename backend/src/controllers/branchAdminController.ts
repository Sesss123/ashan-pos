const prisma = require('../config/db');

// ---- BRANCH TRANSFERS ----

const createBranchTransfer = async (req, res, next) => {
  try {
    const { fromBranchId, toBranchId, items, dispatchedBy } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      const transfers = [];
      
      for (const item of items) {
        // Find stock at source branch
        const sourceStock = await tx.inventoryItem.findFirst({
          where: { branchId: fromBranchId, id: item.inventoryItemId }
        });
        
        if (sourceStock && sourceStock.quantity >= item.quantity) {
          // Reduce stock from source
          await tx.inventoryItem.update({
            where: { id: sourceStock.id },
            data: { quantity: { decrement: item.quantity } }
          });

          // Increase or create stock at destination
          const destStock = await tx.inventoryItem.findFirst({
            where: { branchId: toBranchId, sku: sourceStock.sku }
          });

          if (destStock) {
            await tx.inventoryItem.update({
              where: { id: destStock.id },
              data: { quantity: { increment: item.quantity } }
            });
          } else {
            await tx.inventoryItem.create({
              data: {
                branchId: toBranchId,
                name: sourceStock.name,
                sku: sourceStock.sku,
                categoryId: sourceStock.categoryId,
                quantity: item.quantity,
                minStock: sourceStock.minStock,
                unitCost: sourceStock.unitCost,
                unit: sourceStock.unit
              }
            });
          }

          // Record transfer
          const transfer = await tx.inventoryTransfer.create({
            data: {
              fromBranchId,
              toBranchId,
              inventoryItemId: sourceStock.id,
              quantity: item.quantity,
              transferredBy: dispatchedBy
            }
          });
          transfers.push(transfer);
        } else {
          throw new Error(`Insufficient stock for item ${item.inventoryItemId} at source branch`);
        }
      }
      return transfers;
    });

    res.status(201).json({ message: 'Branch transfer completed successfully', transfers: result });
  } catch (error) {
    next(error);
  }
};

const receiveBranchTransfer = async (req, res, next) => {
  // Inventory transfers are now instant in the single-step model
  res.json({ message: 'Inventory transfers are processed instantly in the new schema.' });
};

// ---- BRANCH CONFIGURATION ----

const updateBranchConfig = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { taxRate, currency, timezone, isActive } = req.body;

    const branch = await prisma.branch.update({
      where: { id },
      data: { taxRate, currency, timezone, isActive }
    });

    res.json({ message: 'Branch configuration updated', branch });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBranchTransfer,
  receiveBranchTransfer,
  updateBranchConfig
};
