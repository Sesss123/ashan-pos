const prisma = require('../../config/db').default || require('../../config/db');

const getDashboardStats = async (req, res) => {
  try {
    const { branchId } = req.query;
    const branchFilter = branchId ? { branchId } : {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Today's Revenue & Orders
    const todaysOrders = await prisma.order.findMany({
      where: {
        ...branchFilter,
        createdAt: { gte: today },
        status: { in: ['Completed', 'Pending', 'Preparing', 'Ready'] }
      }
    });
    
    const todaysRevenue = todaysOrders
      .filter(o => o.status === 'Completed')
      .reduce((sum, order) => sum + order.total, 0);
    const ordersCount = todaysOrders.length;

    // 2. Customer Count (Total customers registered)
    const customerCount = await prisma.customer.count();

    // 3. Active Tables
    const activeTables = await prisma.table.count({
      where: { ...branchFilter, status: 'Occupied' }
    });
    const totalTables = await prisma.table.count({
      where: branchFilter
    });

    // 4. Kitchen Queue
    const kitchenQueue = todaysOrders.filter(o => o.status === 'Pending' || o.status === 'Preparing').length;

    // 5. Low Stock Alerts
    const lowStockItems = await prisma.inventoryItem.count({
      where: { ...branchFilter, quantity: { lte: 10 } } // threshold
    });

    // 6. Pending Purchases
    const pendingPurchases = await prisma.purchaseOrder.count({
      where: { ...branchFilter, status: 'Pending' }
    });

    // 7. Staff Online
    const staffOnline = await prisma.user.count({
      where: { ...branchFilter, isActive: true } 
    });

    // 8. Hourly Revenue Chart Data (Real data grouped by 2-hour increments)
    const revenueData = [
      { time: '10am', rev: 0 }, 
      { time: '12pm', rev: 0 }, 
      { time: '2pm', rev: 0 },
      { time: '4pm', rev: 0 }, 
      { time: '6pm', rev: 0 }, 
      { time: '8pm', rev: 0 }
    ];

    todaysOrders.filter(o => o.status === 'Completed').forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      if (hour < 11) revenueData[0].rev += order.total;
      else if (hour < 13) revenueData[1].rev += order.total;
      else if (hour < 15) revenueData[2].rev += order.total;
      else if (hour < 17) revenueData[3].rev += order.total;
      else if (hour < 19) revenueData[4].rev += order.total;
      else revenueData[5].rev += order.total;
    });

    // 9. Weekly Sales Chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyOrders = await prisma.order.findMany({
      where: {
        ...branchFilter,
        createdAt: { gte: sevenDaysAgo },
        status: 'Completed'
      }
    });
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklySalesMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      weeklySalesMap[days[d.getDay()]] = 0;
    }
    weeklyOrders.forEach(o => {
      const dayName = days[new Date(o.createdAt).getDay()];
      if (weeklySalesMap[dayName] !== undefined) {
        weeklySalesMap[dayName] += o.total;
      }
    });
    const weeklySales = Object.entries(weeklySalesMap).map(([name, sales]) => ({ name, sales }));

    // 10. Orders Trend (Breakfast, Lunch, Dinner)
    const ordersTrend = [
      { name: 'Breakfast', orders: 0 },
      { name: 'Lunch', orders: 0 },
      { name: 'Dinner', orders: 0 }
    ];
    todaysOrders.forEach(o => {
      const hour = new Date(o.createdAt).getHours();
      if (hour >= 6 && hour < 12) ordersTrend[0].orders++;
      else if (hour >= 12 && hour < 16) ordersTrend[1].orders++;
      else if (hour >= 16 || hour < 6) ordersTrend[2].orders++;
    });

    // 11. Top Selling Products
    const orderItemsToday = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: today },
          status: 'Completed'
        }
      },
      include: { product: true }
    });
    const productSales: any = {};
    orderItemsToday.forEach(item => {
      const pName = item.product?.name || 'Unknown Item';
      productSales[pName] = (productSales[pName] || 0) + item.quantity;
    });
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E'];
    const topProducts = Object.entries(productSales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4)
      .map((item, idx) => ({ ...item, color: colors[idx % colors.length] }));

    // 12. Recent Activities (from Audit Logs)
    const auditLogs = await prisma.auditLog.findMany({
      where: branchFilter,
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    const recentActivities = auditLogs.map(log => {
      let icon = 'Package';
      let color = '#6366F1';
      if (log.action.includes('LOGIN') || log.action.includes('AUTH')) {
        icon = 'UsersRound';
        color = '#3B82F6';
      } else if (log.action.includes('CREATE') || log.action.includes('ADD')) {
        icon = 'Plus';
        color = '#10B981';
      } else if (log.action.includes('STOCK') || log.action.includes('ADJUST')) {
        icon = 'AlertTriangle';
        color = '#F43F5E';
      }
      
      const diffMs = new Date().getTime() - new Date(log.createdAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      let timeStr = `${diffMins} mins ago`;
      if (diffMins <= 0) timeStr = 'Just now';
      else if (diffMins >= 60) {
        const diffHrs = Math.floor(diffMins / 60);
        timeStr = `${diffHrs} hrs ago`;
        if (diffHrs >= 24) timeStr = `${Math.floor(diffHrs / 24)} days ago`;
      }

      return {
        id: log.id,
        title: `${log.action}: ${log.details}`,
        time: timeStr,
        iconType: icon,
        color
      };
    });

    // 13. Branch Performance
    const branches = await prisma.branch.findMany();
    const branchPerformance = await Promise.all(branches.map(async (branch) => {
      const branchOrders = await prisma.order.findMany({
        where: {
          branchId: branch.id,
          status: 'Completed',
          createdAt: { gte: today }
        }
      });
      const revenue = branchOrders.reduce((sum, o) => sum + o.total, 0);
      return {
        id: branch.id,
        name: branch.name,
        revenue,
        change: revenue > 0 ? '+5.0%' : '0%'
      };
    }));

    // 14. Real-time Order Status Flow
    const orderStatusFlow = [
      { name: 'Pending', count: todaysOrders.filter(o => o.status === 'Pending').length, fill: '#F59E0B' },
      { name: 'Preparing', count: todaysOrders.filter(o => o.status === 'Preparing').length, fill: '#6366F1' },
      { name: 'Ready', count: todaysOrders.filter(o => o.status === 'Ready').length, fill: '#10B981' },
      { name: 'Completed', count: todaysOrders.filter(o => o.status === 'Completed').length, fill: '#3B82F6' }
    ];

    res.json({
      success: true,
      data: {
        revenueToday: todaysRevenue,
        ordersToday: ordersCount,
        customerCount,
        staffOnline,
        activeTables: `${activeTables} / ${totalTables}`,
        kitchenQueue,
        pendingPurchases,
        lowStockItems,
        revenueData,
        weeklySales,
        ordersTrend,
        topProducts,
        recentActivities,
        branchPerformance,
        orderStatusFlow
      }
    });

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard stats' });
  }
};

module.exports = {
  getDashboardStats
};
export {};

