const prisma = require('../config/db');

// ---- ENTERPRISE ANALYTICS & REPORTING ----

const getExecutiveDashboard = async (req, res) => {
  try {
    const { branchId } = req.query;

    // 1. Total Revenue (Completed Orders)
    const revenueAgg = await prisma.order.aggregate({
      _sum: { total: true },
      where: { branchId, status: 'Completed' }
    });

    // 2. Outstanding Payables (Suppliers)
    const payablesAgg = await prisma.supplier.aggregate({
      _sum: { outstandingBalance: true },
      where: { branchId }
    });

    // 3. Customer Wallets (Liability)
    const walletAgg = await prisma.customer.aggregate({
      _sum: { credit: true },
      where: { branchId }
    });

    // 4. Low Stock Alerts
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { branchId },
      select: { quantity: true, minStock: true }
    });
    const lowStockCount = inventoryItems.filter(item => item.quantity <= item.minStock).length;

    res.json({
      revenue: revenueAgg._sum.total || 0,
      outstandingPayables: payablesAgg._sum.outstandingBalance || 0,
      customerWalletLiability: walletAgg._sum.credit || 0,
      lowStockAlerts: lowStockCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch executive metrics', error: error.message });
  }
};

const getSalesChartData = async (req, res) => {
  try {
    const { branchId, range = '7d' } = req.query;
    
    // In a real production app, we would use raw SQL (e.g., date_trunc) 
    // to group by day. For this demonstration, we fetch and group in JS.
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 7);

    const orders = await prisma.order.findMany({
      where: {
        branchId,
        status: 'Completed',
        createdAt: { gte: dateLimit }
      },
      select: { total: true, createdAt: true }
    });

    const dailySales = {};
    orders.forEach(order => {
      // Convert UTC createdAt to Asia/Colombo local date string (YYYY-MM-DD)
      const day = order.createdAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
      if (!dailySales[day]) dailySales[day] = 0;
      dailySales[day] += order.total;
    });

    res.json(dailySales);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch sales data', error: error.message });
  }
};

module.exports = {
  getExecutiveDashboard,
  getSalesChartData
};
