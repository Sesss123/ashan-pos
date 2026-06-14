const prisma = require('../../config/db').default || require('../../config/db');

// Fetch system audit logs with filters and page offsets
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 100, action, module: modFilter, branchId, search } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (modFilter) filter.module = modFilter;
    if (branchId) filter.branchId = branchId;
    if (search) {
      filter.OR = [
        { details: { contains: search } },
        { action: { contains: search } },
        { module: { contains: search } }
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    });

    const total = await prisma.auditLog.count({ where: filter });

    // Look up users in memory to map the user object required by the React frontend
    const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, role: true }
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const formattedLogs = logs.map(log => ({
      ...log,
      user: userMap.get(log.userId) || { name: 'System', role: 'System' }
    }));

    res.json({
      success: true,
      data: formattedLogs,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAuditLogs
};
