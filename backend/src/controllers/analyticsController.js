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
    const walletAgg = await prisma.customerWallet.aggregate({
      _sum: { balance: true },
      where: { customer: { branchId } }
    });

    // 4. Low Stock Alerts
    const lowStockCount = await prisma.stockAlert.count({
      where: { branchId, status: 'Active' }
    });

    res.json({
      revenue: revenueAgg._sum.total || 0,
      outstandingPayables: payablesAgg._sum.outstandingBalance || 0,
      customerWalletLiability: walletAgg._sum.balance || 0,
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
      const day = order.createdAt.toISOString().split('T')[0];
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
