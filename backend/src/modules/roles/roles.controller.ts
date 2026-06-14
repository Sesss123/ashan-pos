const prisma = require('../../config/db').default || require('../../config/db');
const socketEmitter = require('../../realtime/socketEmitter');

// Default permissions for system roles to initialize database with
const SYSTEM_ROLES_DEFAULT = [
  {
    name: 'Admin',
    isSystem: true,
    permissions: JSON.stringify({
      dashboard: 'write',
      branches: 'write',
      users: 'write',
      roles: 'write',
      menu: 'write',
      inventory: 'write',
      suppliers: 'write',
      purchases: 'write',
      customers: 'write',
      reports: 'write',
      auditLogs: 'write',
      security: 'write',
      backups: 'write',
      settings: 'write'
    })
  },
  {
    name: 'Manager',
    isSystem: true,
    permissions: JSON.stringify({
      dashboard: 'write',
      branches: 'read',
      users: 'write',
      roles: 'read',
      menu: 'write',
      inventory: 'write',
      suppliers: 'write',
      purchases: 'write',
      customers: 'write',
      reports: 'write',
      auditLogs: 'read',
      security: 'read',
      backups: 'read',
      settings: 'read'
    })
  },
  {
    name: 'Cashier',
    isSystem: true,
    permissions: JSON.stringify({
      dashboard: 'read',
      branches: 'read',
      users: 'none',
      roles: 'none',
      menu: 'read',
      inventory: 'read',
      suppliers: 'none',
      purchases: 'none',
      customers: 'write',
      reports: 'none',
      auditLogs: 'none',
      security: 'none',
      backups: 'none',
      settings: 'none'
    })
  },
  {
    name: 'Waiter',
    isSystem: true,
    permissions: JSON.stringify({
      dashboard: 'none',
      branches: 'read',
      users: 'none',
      roles: 'none',
      menu: 'read',
      inventory: 'none',
      suppliers: 'none',
      purchases: 'none',
      customers: 'read',
      reports: 'none',
      auditLogs: 'none',
      security: 'none',
      backups: 'none',
      settings: 'none'
    })
  },
  {
    name: 'Kitchen',
    isSystem: true,
    permissions: JSON.stringify({
      dashboard: 'none',
      branches: 'read',
      users: 'none',
      roles: 'none',
      menu: 'read',
      inventory: 'read',
      suppliers: 'none',
      purchases: 'none',
      customers: 'none',
      reports: 'none',
      auditLogs: 'none',
      security: 'none',
      backups: 'none',
      settings: 'none'
    })
  }
];

// Helper to seed default roles if none exist
const seedSystemRoles = async () => {
  const count = await prisma.rolePolicy.count();
  if (count === 0) {
    for (const r of SYSTEM_ROLES_DEFAULT) {
      await prisma.rolePolicy.create({ data: r });
    }
  }
};

// Get all roles
const getRoles = async (req, res) => {
  try {
    await seedSystemRoles();
    const roles = await prisma.rolePolicy.findMany({
      orderBy: { isSystem: 'desc' }
    });
    
    // Parse permissions from JSON strings back to objects for the UI
    const formatted = roles.map(r => ({
      ...r,
      permissions: JSON.parse(r.permissions)
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create custom role
const createRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const existing = await prisma.rolePolicy.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Role with this name already exists' });
    }

    const role = await prisma.rolePolicy.create({
      data: {
        name,
        permissions: JSON.stringify(permissions || {}),
        isSystem: false
      }
    });

    const formattedRole = { ...role, permissions: JSON.parse(role.permissions) };
    // Emit real-time event
    socketEmitter.role.created(req.io, formattedRole);

    res.status(201).json({ success: true, data: formattedRole });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update role permissions/name
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, permissions } = req.body;

    const existing = await prisma.rolePolicy.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // System roles can be updated but their name cannot be changed to prevent breaking auth checks
    const updateData = {};
    if (permissions) {
      updateData.permissions = JSON.stringify(permissions);
    }
    if (!existing.isSystem && name) {
      updateData.name = name;
    }

    const role = await prisma.rolePolicy.update({
      where: { id },
      data: updateData
    });

    const formattedRole = { ...role, permissions: JSON.parse(role.permissions) };
    // Emit real-time event — notifies admin room + users in this role's room
    socketEmitter.role.updated(req.io, formattedRole);

    res.json({ success: true, data: formattedRole });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clone a role
const cloneRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    if (!newName) {
      return res.status(400).json({ success: false, message: 'Cloned role name is required' });
    }

    const target = await prisma.rolePolicy.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ success: false, message: 'Role to clone not found' });
    }

    const nameExists = await prisma.rolePolicy.findUnique({ where: { name: newName } });
    if (nameExists) {
      return res.status(400).json({ success: false, message: 'Role with this name already exists' });
    }

    const role = await prisma.rolePolicy.create({
      data: {
        name: newName,
        permissions: target.permissions,
        isSystem: false
      }
    });

    const formattedRole = { ...role, permissions: JSON.parse(role.permissions) };
    // Emit real-time event
    socketEmitter.role.cloned(req.io, formattedRole);

    res.status(201).json({ success: true, data: formattedRole });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete custom role
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await prisma.rolePolicy.findUnique({ where: { id } });
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ success: false, message: 'Protected System Roles cannot be deleted.' });
    }

    await prisma.rolePolicy.delete({ where: { id } });

    // Emit real-time event
    socketEmitter.role.deleted(req.io, id);

    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getRoles,
  createRole,
  updateRole,
  cloneRole,
  deleteRole
};
