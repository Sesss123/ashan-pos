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
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    // Track Session & Device & History
    await Promise.all([
      authRepository.createSession(user.id, token, ipAddress, userAgent),
      authRepository.logLoginHistory(user.id, ipAddress, userAgent, 'SUCCESS'),
      authRepository.registerDevice(user.id, `device-${ipAddress}`, 'Unknown', userAgent, ipAddress)
    ]);

    return {
      token,
      user: { id: user.id, name: user.name, role: user.role, email: user.email }
    };
  }
}

module.exports = new AuthService();
