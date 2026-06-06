const prisma = require('../config/db');

// Add a new product
const addProduct = async (req, res) => {
  try {
    const { branchId, name, category, sku, barcode, description, price, cost, unit, reorderLevel } = req.body;
    
    const product = await prisma.product.create({
      data: { branchId, name, category, sku, barcode, description, price, cost, unit, reorderLevel }
    });

    res.status(201).json({ message: 'Product created', product });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
};

// Receive new Stock (Stock IN)
const addStock = async (req, res) => {
  try {
    const { productId, branchId, batchNumber, quantity, expiryDate, location } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update or Create Stock Item
      let stockItem = await tx.stockItem.findFirst({
        where: { productId, branchId, batchNumber }
      });

      if (stockItem) {
        stockItem = await tx.stockItem.update({
          where: { id: stockItem.id },
          data: { quantity: stockItem.quantity + quantity }
        });
      } else {
        stockItem = await tx.stockItem.create({
          data: { productId, branchId, batchNumber, quantity, expiryDate, location }
        });
      }

      // 2. Record Stock Movement
      await tx.stockMovement.create({
        data: {
          productId, branchId, type: 'IN', quantity, notes: 'Stock addition'
        }
      });

      // 3. Resolve any pending Low Stock Alerts
      const product = await tx.product.findUnique({ where: { id: productId } });
      const totalStock = await tx.stockItem.aggregate({
        where: { productId, branchId },
        _sum: { quantity: true }
      });

      if (totalStock._sum.quantity > product.reorderLevel) {
        await tx.stockAlert.updateMany({
          where: { productId, branchId, isResolved: false, type: 'LOW_STOCK' },
          data: { isResolved: true }
        });
      }

      return stockItem;
    });

    res.status(201).json({ message: 'Stock added successfully', stock: result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add stock' });
  }
};

// Check for low stock alerts (Engine function, could be called periodically or after sales)
const checkAlerts = async (req, res) => {
  try {
    const { branchId } = req.query;
    
    // In a real scenario, you'd aggregate total stock per product and compare against reorderLevel.
    // Here we just return existing unresolved alerts.
    const alerts = await prisma.stockAlert.findMany({
      where: { branchId, isResolved: false },
      include: { product: true }
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch alerts' });
  }
};

// Get Stock List
const getStockList = async (req, res) => {
  try {
    const { branchId } = req.query;
    const stocks = await prisma.stockItem.findMany({
      where: { branchId },
      include: { product: true }
    });
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stock list' });
  }
};

module.exports = {
  addProduct,
  addStock,
  checkAlerts,
  getStockList
};
