const bcrypt = require('bcrypt');
const prisma = require('../../config/db').default || require('../../config/db');
const socketEmitter = require('../../realtime/socketEmitter');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        branchId: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error retrieving users' });
  }
};

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, branchId } = req.body;

    // Check if email exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        branchId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      }
    });

    // Emit real-time event (admin-only room)
    socketEmitter.user.created(req.io, newUser);
    socketEmitter.dashboard.statsUpdated(req.io, { trigger: 'user_create' });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error creating user' });
  }
};

// Update an existing user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, branchId, isActive } = req.body;

    // Avoid updating to an email that belongs to another user
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ message: 'Email already in use by another user' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name, email, role, branchId, isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        branchId: true,
      }
    });

    // Emit real-time event (admin room + user-specific room)
    socketEmitter.user.updated(req.io, updatedUser);

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error updating user' });
  }
};

// Soft delete a user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.user.update({
      where: { id },
      data: { 
        isDeleted: true,
        isActive: false,
        deletedAt: new Date()
      }
    });

    // Emit real-time event
    socketEmitter.user.deleted(req.io, id);
    socketEmitter.dashboard.statsUpdated(req.io, { trigger: 'user_delete' });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
};
