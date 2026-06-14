const prisma = require('../config/db');
const socketEmitter = require('../realtime/socketEmitter');
const { sendNotification } = require('../modules/notifications/notifications.controller');

// Get Dashboard Data (KPIs + Items)
const getInventoryDashboard = async (req, res) => {
  try {
    const where = {};
    if (req.user && req.user.role !== 'Admin' && req.user.branchId) {
      where.branchId = req.user.branchId;
    }
    const items = await prisma.inventoryItem.findMany({ where });

    let totalItems = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValue = 0;

    items.forEach(item => {
      totalItems += 1;
      totalValue += item.quantity * item.unitCost;
      if (item.quantity === 0) {
        outOfStockCount += 1;
      } else if (item.quantity <= item.minStock) {
        lowStockCount += 1;
      }
    });

    res.json({
      kpis: {
        totalItems,
        lowStockCount,
        outOfStockCount,
        totalValue
      },
      items
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch inventory dashboard', error: error.message });
  }
};

// Adjust Stock (IN/OUT)
const adjustStock = async (req, res) => {
  try {
    const { itemId, type, quantity } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      if (!item) throw new Error('Item not found');

      const newQuantity = type === 'IN' 
        ? item.quantity + quantity 
        : Math.max(0, item.quantity - quantity);

      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQuantity }
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          itemId,
          type,
          quantity
        }
      });

      return { updatedItem, movement };
    });

    // Emit stock moved event (throttled 500ms)
    socketEmitter.inventory.stockMoved(req.io, result.movement);
    socketEmitter.inventory.updated(req.io, result.updatedItem);

    // Detect low stock and emit alert
    if (result.updatedItem.quantity <= result.updatedItem.minStock && result.updatedItem.quantity > 0) {
      socketEmitter.inventory.lowStock(req.io, result.updatedItem);
      // Persist to notification center
      await sendNotification({
        message: `Low stock alert: ${result.updatedItem.name} has dropped to ${result.updatedItem.quantity} ${result.updatedItem.unit}`,
        category: 'Inventory',
        priority: 'High',
        io: req.io
      });
    }

    // Trigger dashboard KPI refresh
    socketEmitter.dashboard.statsUpdated(req.io, { trigger: 'inventory_adjust' });

    res.json({ message: 'Stock adjusted successfully', result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to adjust stock', error: error.message });
  }
};

// Get Inventory Timeline (Movements)
const getInventoryTimeline = async (req, res) => {
  try {
    const where = {};
    if (req.user && req.user.role !== 'Admin' && req.user.branchId) {
      where.item = { branchId: req.user.branchId };
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: { item: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(movements);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch timeline', error: error.message });
  }
};

// Get Purchase Orders
const getPurchaseOrders = async (req, res) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: { include: { item: true } },
        receipts: { include: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch purchase orders', error: error.message });
  }
};

// CRUD for Items
const createItem = async (req, res) => {
  try {
    const { name, sku, quantity, minStock, unitCost, unit } = req.body;
    const branchId = (req.user && req.user.role !== 'Admin') ? req.user.branchId : (req.body.branchId || null);

    const item = await prisma.inventoryItem.create({
      data: { name, sku, quantity, minStock, unitCost, unit, branchId }
    });

    // Emit real-time event
    socketEmitter.inventory.itemCreated(req.io, item);
    socketEmitter.dashboard.statsUpdated(req.io, { trigger: 'inventory_create' });

    res.status(201).json({ message: 'Item created', data: item });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create item', error: error.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, minStock, unitCost, unit } = req.body;
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: { name, sku, minStock, unitCost, unit }
    });

    // Emit real-time event
    socketEmitter.inventory.updated(req.io, item);

    res.json({ message: 'Item updated', data: item });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update item', error: error.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.inventoryItem.delete({ where: { id } });

    // Emit real-time event
    socketEmitter.inventory.itemDeleted(req.io, id);
    socketEmitter.dashboard.statsUpdated(req.io, { trigger: 'inventory_delete' });

    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete item', error: error.message });
  }
};

// Transfer Stock Between Branches
const transferStock = async (req, res) => {
  try {
    const { inventoryItemId, fromBranchId, toBranchId, quantity, transferredBy } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const sourceItem = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } });
      if (!sourceItem) throw new Error('Source item not found');

      if (sourceItem.quantity < quantity) {
        throw new Error('Insufficient stock for transfer');
      }

      const updatedSource = await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantity: sourceItem.quantity - quantity }
      });

      let targetItem = await tx.inventoryItem.findFirst({
        where: { 
           branchId: toBranchId,
           name: sourceItem.name
        }
      });

      if (targetItem) {
        targetItem = await tx.inventoryItem.update({
          where: { id: targetItem.id },
          data: { quantity: targetItem.quantity + quantity }
        });
      } else {
        const uniqueSuffix = Math.random().toString(36).substring(2, 6);
        targetItem = await tx.inventoryItem.create({
          data: {
            name: sourceItem.name,
            sku: sourceItem.sku ? `${sourceItem.sku}-${toBranchId.substring(0,4)}-${uniqueSuffix}` : null,
            quantity: quantity,
            minStock: sourceItem.minStock,
            unitCost: sourceItem.unitCost,
            unit: sourceItem.unit,
            categoryId: sourceItem.categoryId,
            branchId: toBranchId
          }
        });
      }

      const transfer = await tx.inventoryTransfer.create({
        data: {
          inventoryItemId: sourceItem.id,
          fromBranchId,
          toBranchId,
          quantity,
          transferredBy: transferredBy || req.user?.id || 'System'
        }
      });

      await tx.inventoryMovement.create({
        data: { itemId: sourceItem.id, type: 'OUT', quantity }
      });
      await tx.inventoryMovement.create({
        data: { itemId: targetItem.id, type: 'IN', quantity }
      });

      return { transfer, updatedSource, targetItem };
    });

    socketEmitter.dashboard.statsUpdated(req.io, { trigger: 'inventory_transfer' });

    res.json({ message: 'Stock transferred successfully', data: result.transfer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to transfer stock', error: error.message });
  }
};

module.exports = {
  getInventoryDashboard,
  adjustStock,
  getInventoryTimeline,
  getPurchaseOrders,
  createItem,
  updateItem,
  deleteItem,
  transferStock
};
