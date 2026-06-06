const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { generateTokens } = require('../utils/jwt');

const login = async (req, res) => {
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

    const { accessToken, refreshToken } = generateTokens({ id: user.id, role: userRole });

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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const refreshToken = async (req, res) => {
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
    const tokens = generateTokens({ id: user.id, role: userRole });

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
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    await prisma.session.update({
      where: { refreshToken },
      data: { isValid: false }
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed' });
  }
};

module.exports = {
  login,
  refreshToken,
  logout
};
