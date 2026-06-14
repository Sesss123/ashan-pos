import prisma from '../../config/db';

class AuthRepository {
  async findUserByEmail(email) {
    return prisma.user.findUnique({ 
      where: { email },
      include: { rolePolicy: true }
    });
  }

  async createSession(userId, token, ipAddress, userAgent) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
    
    return prisma.session.create({
      data: {
        userId,
        token,
        deviceIp: ipAddress,
        userAgent,
        expiresAt
      }
    });
  }

  async logLoginHistory(userId, ipAddress, userAgent, status) {
    return prisma.loginHistory.create({
      data: { userId, ipAddress, userAgent, status }
    });
  }

  async registerDevice(userId, deviceId, os, browser, ipAddress) {
    return prisma.device.upsert({
      where: { deviceId },
      update: { lastIp: ipAddress, lastLogin: new Date() },
      create: { userId, deviceId, os, browser, lastIp: ipAddress, isTrusted: true }
    });
  }
}

module.exports = new AuthRepository();

export {};
