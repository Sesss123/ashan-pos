const prisma = require('../../config/db').default || require('../../config/db');

const getDashboardKPIs = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { branchId } = req.query;
    const filter = {
      createdAt: { gte: today },
      status: 'Completed'
    };
    if (branchId) filter.branchId = branchId;

    const todayOrders = await prisma.order.findMany({
      where: filter
    });

    const totalSales = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = todayOrders.length;

    const activeTables = await prisma.table.count({
      where: { status: 'Occupied' }
    });

    res.json({
      success: true,
      data: {
        totalSales,
        totalOrders,
        activeTables
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    filter.status = 'Completed';
    if (branchId) filter.branchId = branchId;

    const orders = await prisma.order.findMany({
      where: filter,
      orderBy: { createdAt: 'asc' }
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAIForecast = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastWeek = new Date(today);
    pastWeek.setDate(pastWeek.getDate() - 7);

    const { branchId } = req.query;
    const filter = {
      createdAt: { gte: pastWeek },
      status: 'Completed'
    };
    if (branchId) filter.branchId = branchId;

    // Get last 7 days of sales
    const pastOrders = await prisma.order.findMany({
      where: filter
    });

    // Group by day to find moving average trend
    const salesByDay = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(pastWeek);
      d.setDate(d.getDate() + i);
      salesByDay[d.toISOString().split('T')[0]] = 0;
    }

    pastOrders.forEach(order => {
      const d = order.createdAt.toISOString().split('T')[0];
      if (salesByDay[d] !== undefined) {
        salesByDay[d] += order.total;
      }
    });

    const values = Object.values(salesByDay);
    const avgDailySales = values.reduce((sum, val) => sum + val, 0) / 7;
    const growthTrend = 1.05; // Simulate a 5% positive trend

    // Forecast next 7 days
    const forecast = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      
      const historicalBase = values[i - 1] || avgDailySales;
      // Add some random noise (-10% to +10%) and apply growth trend
      const noise = 0.9 + (Math.random() * 0.2);
      const predictedValue = historicalBase * growthTrend * noise;

      forecast.push({
        date: d.toISOString().split('T')[0],
        historical: historicalBase,
        predicted: Math.round(predictedValue)
      });
    }

    res.json({ success: true, data: forecast });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMultiBranchAnalytics = async (req, res) => {
  try {
    const branches = await prisma.branch.findMany();
    
    // Aggregate sales by branch
    const branchSales = await Promise.all(
      branches.map(async (branch) => {
        const orders = await prisma.order.findMany({
          where: { branchId: branch.id, status: 'Completed' }
        });
        
        const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
        return {
          branchId: branch.id,
          name: branch.name,
          totalSales,
          totalOrders: orders.length
        };
      })
    );

    res.json({ success: true, data: branchSales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardKPIs,
  getSalesReport,
  getAIForecast,
  getMultiBranchAnalytics
};
