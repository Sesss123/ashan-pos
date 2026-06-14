const prisma = require('../config/db');

const logAction = async (branchId, userId, action, resource, details, req) => {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress || 'Unknown IP';
    
    await prisma.auditLog.create({
      data: {
        branchId,
        userId,
        action,
        resource,
        details: JSON.stringify(details),
        ipAddress
      }
    });
  } catch (error) {
    console.error('Audit Logging Failed:', error.message);
  }
};

module.exports = {
  logAction
};
