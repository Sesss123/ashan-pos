const prisma = require('../config/db');

// ---- AUDIT LOGS ----

const getAuditLogs = async (req, res) => {
  try {
    const { branchId, userId } = req.query;
    
    let whereClause = {};
    if (branchId) whereClause.branchId = branchId;
    if (userId) whereClause.userId = userId;

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      take: 100 // Limit to last 100 for dashboard
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
};

// ---- DEVICE & SESSION MONITORING ----

const getActiveDevices = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const devices = await prisma.device.findMany({
      where: { userId, isRevoked: false },
      orderBy: { lastActive: 'desc' }
    });

    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch active devices' });
  }
};

const revokeDevice = async (req, res) => {
  try {
    const { deviceId } = req.params; // PK of the device

    await prisma.device.update({
      where: { id: deviceId },
      data: { isRevoked: true }
    });

    // In a real application, you would also clear associated RefreshTokens or Sessions
    // so the device is immediately logged out.

    res.json({ message: 'Device revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to revoke device' });
  }
};

const getLoginHistory = async (req, res) => {
  try {
    const { userId } = req.query;

    let whereClause = {};
    if (userId) whereClause.userId = userId;

    const history = await prisma.loginActivity.findMany({
      where: whereClause,
      include: { user: { select: { email: true } } },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch login history' });
  }
};

module.exports = {
  getAuditLogs,
  getActiveDevices,
  revokeDevice,
  getLoginHistory
};
