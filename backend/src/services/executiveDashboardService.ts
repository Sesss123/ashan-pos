const prisma = require('../config/db');

class ExecutiveDashboardService {
  async getEnterpriseGodView() {
    // Aggregates data across ALL branches for the CEO/Owner Dashboard
    
    // 1. Total Enterprise Revenue (Sum of all completed orders)
    const totalRevenueResult = await prisma.order.aggregate({
      where: { status: 'Completed', isDeleted: false },
      _sum: { total: true }
    });

    // 2. Active Branches
    const activeBranches = await prisma.branch.count({ where: { isActive: true } });

    // 3. Current Live Orders across all branches
    const liveOrders = await prisma.order.count({
      where: { status: 'Pending', isDeleted: false }
    });

    // 4. Latest AI Insights
    const insights = await prisma.businessInsight.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return {
      enterpriseRevenue: totalRevenueResult._sum.total || 0,
      activeBranches,
      liveOrders,
      insights,
      healthStatus: "Optimal",
      lastBackupTime: new Date()
    };
  }
}

module.exports = new ExecutiveDashboardService();
