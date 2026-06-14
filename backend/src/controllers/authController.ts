const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { generateTokens } = require('../utils/jwt');
const socketEmitter = require('../realtime/socketEmitter');

const login = async (req, res, next) => {
  try {
    const { email, password, deviceId, deviceName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Assume user has at least one role for Phase 1
    const userRole = user.roles.length > 0 ? user.roles[0].role.name : 'User';

    const { accessToken, refreshToken } = generateTokens({ id: user.id, role: userRole, branchId: user.branchId });

    // Store refresh token in db (Session management)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        deviceId: deviceId || null,
      }
    });

    // Update or create device log
    if (deviceId) {
      await prisma.device.upsert({
        where: { id: deviceId },
        update: { lastActive: new Date(), deviceName },
        create: { id: deviceId, userId: user.id, deviceName, lastActive: new Date() }
      });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole,
        branchId: user.branchId
      },
      accessToken,
      refreshToken
    });

    // Emit security.login event after responding (non-blocking)
    socketEmitter.security.login(req.io, {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: userRole
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  const { token } = req.body;

  if (!token) return res.status(401).json({ message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    
    // Check if session exists and is valid
    const session = await prisma.session.findUnique({
      where: { refreshToken: token }
    });

    if (!session || !session.isValid) {
      return res.status(403).json({ message: 'Invalid or revoked session' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { roles: { include: { role: true } } }
    });

    const userRole = user.roles.length > 0 ? user.roles[0].role.name : 'User';
    const tokens = generateTokens({ id: user.id, role: userRole, branchId: user.branchId });

    // Refresh token rotation: delete old, create new
    await prisma.session.delete({ where: { id: session.id } });
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt,
        deviceId: session.deviceId
      }
    });

    res.json(tokens);
  } catch (error) {
    console.error('Refresh token error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
    next(error);
  }
};

const logout = async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    const session = await prisma.session.findUnique({ where: { refreshToken } });
    await prisma.session.update({
      where: { refreshToken },
      data: { isValid: false }
    });
    res.json({ message: 'Logged out successfully' });

    // Emit security.logout event after responding
    if (session) {
      socketEmitter.security.logout(req.io, { userId: session.userId });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  refreshToken,
  logout
};
