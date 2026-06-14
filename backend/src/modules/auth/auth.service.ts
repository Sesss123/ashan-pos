const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const { JWT_SECRET } = require('../../shared/middlewares/security');

class AuthService {
  async login(email, password, ipAddress, userAgent) {
    const user = await authRepository.findUserByEmail(email);

    if (!user || user.isDeleted || !user.isActive) {
      if (user) await authRepository.logLoginHistory(user.id, ipAddress, userAgent, 'FAILED');
      throw new Error('Invalid credentials or account disabled');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      await authRepository.logLoginHistory(user.id, ipAddress, userAgent, 'FAILED');
      throw new Error('Invalid credentials');
    }

    // Generate JWT
    const permissions = user.rolePolicy ? JSON.parse(user.rolePolicy.permissions) : [];
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, branchId: user.branchId, tenantId: user.tenantId, permissions },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Track Session & Device & History
    await Promise.all([
      authRepository.createSession(user.id, token, ipAddress, userAgent),
      authRepository.logLoginHistory(user.id, ipAddress, userAgent, 'SUCCESS'),
      authRepository.registerDevice(user.id, `device-${ipAddress}`, 'Unknown', userAgent, ipAddress)
    ]);

    return {
      token,
      user: { id: user.id, name: user.name, role: user.role, email: user.email, branchId: user.branchId, tenantId: user.tenantId }
    };
  }

  async register(companyName, userName, email, password, ipAddress) {
    // We import the standard extended prisma here to run the transaction
    const prisma = require('../../config/db').default || require('../../config/db');
    
    // Check if user exists (across all tenants to ensure global email uniqueness for login)
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('Email already registered');

    const hashedPassword = await bcrypt.hash(password, 10);
    const tenantId = require('crypto').randomUUID();
    
    // Massive transaction to provision SaaS tenant
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: { id: tenantId, name: companyName, plan: 'Basic', maxBranches: 1 }
      });

      // 2. Create default Branch
      const branch = await tx.branch.create({
        data: { name: 'Head Office', location: 'Main', tenantId }
      });

      // 3. Create RolePolicies for this tenant
      const ownerPolicy = await tx.rolePolicy.create({
        data: { tenantId, name: 'Owner', permissions: JSON.stringify(['*']), isSystem: true }
      });
      await tx.rolePolicy.createMany({
        data: [
          { tenantId, name: 'Branch Manager', permissions: JSON.stringify(['dashboard.view', 'orders.manage', 'inventory.manage', 'reports.view']), isSystem: true },
          { tenantId, name: 'Cashier', permissions: JSON.stringify(['pos.access', 'orders.create', 'payments.process']), isSystem: true },
          { tenantId, name: 'Waiter', permissions: JSON.stringify(['pos.access', 'orders.create']), isSystem: true },
          { tenantId, name: 'Kitchen', permissions: JSON.stringify(['kds.access', 'orders.update_status']), isSystem: true }
        ]
      });

      // 4. Create User (Owner)
      const user = await tx.user.create({
        data: {
          tenantId,
          branchId: branch.id,
          rolePolicyId: ownerPolicy.id,
          name: userName,
          email,
          password: hashedPassword,
          role: 'Owner', // legacy fallback
          isEmailVerified: false
        }
      });

      return { tenant, branch, user };
    });

    // Auto login
    const token = jwt.sign(
      { id: result.user.id, role: 'Owner', name: result.user.name, branchId: result.branch.id, tenantId, permissions: ['*'] },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { token, user: { id: result.user.id, name: result.user.name, email: result.user.email, tenantId, branchId: result.branch.id } };
  }

  async forgotPassword(email) {
    const prisma = require('../../config/db').default || require('../../config/db');
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');

    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken, resetPasswordExpires: expires }
    });

    // TODO: Send email
    console.log(`[Email Mock] Reset link: http://localhost:3000/reset-password?token=${resetToken}`);
    return { success: true, message: 'Password reset link sent to email' };
  }

  async resetPassword(token, newPassword) {
    const prisma = require('../../config/db').default || require('../../config/db');
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() }
      }
    });

    if (!user) throw new Error('Invalid or expired reset token');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    });

    return { success: true, message: 'Password successfully reset' };
  }
}

module.exports = new AuthService();
