/**
 * socketEmitter.js
 * 
 * Centralized Socket.IO event emitter utility.
 * 
 * Strategy:
 * - io.to('room:admin').emit()  → admin-only events (security, backups, settings)
 * - io.emit()                   → broadcast to all authenticated clients
 * - io.to(`branch:${id}`)      → branch-scoped events for multi-branch isolation
 * - io.to(`user:${id}`)        → user-specific targeted events
 * 
 * Performance:
 * - All events are throttled using lastEmitTime map (no flooding)
 * - Inventory events use 500ms debounce to prevent stock-move storms
 * - Dashboard stats use 2000ms throttle to batch rapid order events
 */

// Throttle registry: eventKey → last emit timestamp
const throttleMap = new Map();

/**
 * Emit a socket event with optional throttling.
 * @param {import('socket.io').Server} io - Socket.IO server instance
 * @param {string} event - Event name
 * @param {*} data - Payload
 * @param {object} options - { room, throttleMs }
 */
const emit = (io, event, data, options = {}) => {
  if (!io) return;

  const { room = null, throttleMs = 0 } = options;

  // Throttle check: skip if same event fired too recently
  if (throttleMs > 0) {
    const key = room ? `${room}:${event}` : event;
    const lastTime = throttleMap.get(key) || 0;
    const now = Date.now();
    if (now - lastTime < throttleMs) {
      return; // Throttled — skip this emit
    }
    throttleMap.set(key, now);
  }

  const payload = {
    event,
    data,
    timestamp: new Date().toISOString()
  };

  if (room) {
    io.to(room).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
};

/**
 * Pre-configured emitters for each domain.
 * These match the event names the frontend useSocketEvent hooks listen to.
 */
module.exports = {
  emit,
  emitToRole: (io, role, event, data) => emit(io, event, data, { room: `role:${role.toLowerCase()}` }),

  // ─── DASHBOARD ────────────────────────────────────────────────
  dashboard: {
    statsUpdated: (io, data) => emit(io, 'dashboard.stats.updated', data, { throttleMs: 2000 }),
    revenueUpdated: (io, data) => emit(io, 'dashboard.revenue.updated', data, { throttleMs: 2000 }),
  },

  // ─── BRANCHES ─────────────────────────────────────────────────
  branch: {
    created: (io, branch) => emit(io, 'branch.created', branch),
    updated: (io, branch) => {
      emit(io, 'branch.updated', branch);
      // Also notify branch-specific room for multi-branch isolation
      if (branch?.id) emit(io, 'branch.updated', branch, { room: `branch:${branch.id}` });
    },
    deleted: (io, branchId) => emit(io, 'branch.deleted', { id: branchId }),
    transferCreated: (io, transfer) => {
      emit(io, 'branch.transfer.created', transfer);
      if (transfer?.fromBranchId) emit(io, 'branch.transfer.created', transfer, { room: `branch:${transfer.fromBranchId}` });
      if (transfer?.toBranchId) emit(io, 'branch.transfer.created', transfer, { room: `branch:${transfer.toBranchId}` });
    },
    transferReceived: (io, transfer) => {
      emit(io, 'branch.transfer.received', transfer);
      if (transfer?.toBranchId) emit(io, 'branch.transfer.received', transfer, { room: `branch:${transfer.toBranchId}` });
    },
  },

  // ─── USERS ────────────────────────────────────────────────────
  user: {
    created: (io, user) => emit(io, 'user.created', user, { room: 'room:admin' }),
    updated: (io, user) => {
      emit(io, 'user.updated', user, { room: 'room:admin' });
      // Also notify the specific user's personal room
      if (user?.id) emit(io, 'user.updated', user, { room: `user:${user.id}` });
    },
    deleted: (io, userId) => emit(io, 'user.deleted', { id: userId }, { room: 'room:admin' }),
    passwordReset: (io, userId) => emit(io, 'user.password_reset', { id: userId }, { room: `user:${userId}` }),
  },

  // ─── ROLES ────────────────────────────────────────────────────
  role: {
    created: (io, role) => emit(io, 'role.created', role, { room: 'room:admin' }),
    updated: (io, role) => {
      emit(io, 'role.updated', role);
      // Notify all users in this role's room that their permissions changed
      if (role?.name) emit(io, 'role.updated', role, { room: `role:${role.name.toLowerCase()}` });
    },
    deleted: (io, roleId) => emit(io, 'role.deleted', { id: roleId }, { room: 'room:admin' }),
    cloned: (io, role) => emit(io, 'role.cloned', role, { room: 'room:admin' }),
  },

  // ─── MENU ─────────────────────────────────────────────────────
  menu: {
    productCreated: (io, product) => emit(io, 'menu.product_created', product),
    productUpdated: (io, product) => emit(io, 'menu.product_updated', product),
    productDeleted: (io, productId) => emit(io, 'menu.product_deleted', { id: productId }),
    categoryCreated: (io, category) => emit(io, 'menu.category_created', category),
    categoryUpdated: (io, category) => emit(io, 'menu.category_updated', category),
    categoryDeleted: (io, categoryId) => emit(io, 'menu.category_deleted', { id: categoryId }),
  },

  // ─── INVENTORY ───────────────────────────────────────────────
  inventory: {
    updated: (io, item) => emit(io, 'inventory.updated', item, { throttleMs: 500 }),
    lowStock: (io, item) => emit(io, 'inventory.low_stock', item),
    stockMoved: (io, movement) => emit(io, 'inventory.stock_moved', movement, { throttleMs: 500 }),
    itemCreated: (io, item) => emit(io, 'inventory.item_created', item),
    itemDeleted: (io, itemId) => emit(io, 'inventory.item_deleted', { id: itemId }),
  },

  // ─── SUPPLIERS ───────────────────────────────────────────────
  supplier: {
    created: (io, supplier) => emit(io, 'supplier.created', supplier),
    updated: (io, supplier) => emit(io, 'supplier.updated', supplier),
  },

  // ─── PURCHASES ───────────────────────────────────────────────
  purchase: {
    created: (io, po) => emit(io, 'purchase.created', po),
    updated: (io, po) => emit(io, 'purchase.updated', po),
    approved: (io, po) => emit(io, 'purchase.approved', po),
    received: (io, po) => emit(io, 'purchase.received', po),
    cancelled: (io, po) => emit(io, 'purchase.cancelled', po),
  },

  // ─── CUSTOMERS ───────────────────────────────────────────────
  customer: {
    created: (io, customer) => emit(io, 'customer.created', customer),
    updated: (io, customer) => emit(io, 'customer.updated', customer),
    deleted: (io, customerId) => emit(io, 'customer.deleted', { id: customerId }),
    creditUpdated: (io, data) => emit(io, 'customer.credit_updated', data),
  },

  // ─── REPORTS ─────────────────────────────────────────────────
  reports: {
    generated: (io, data) => emit(io, 'reports.generated', data, { room: 'room:admin' }),
  },

  // ─── AUDIT LOGS ──────────────────────────────────────────────
  audit: {
    logCreated: (io, log) => emit(io, 'audit.log.created', log, { room: 'room:admin' }),
  },

  // ─── SECURITY ────────────────────────────────────────────────
  security: {
    login: (io, data) => emit(io, 'security.login', data, { room: 'room:admin' }),
    logout: (io, data) => emit(io, 'security.logout', data, { room: 'room:admin' }),
    alert: (io, data) => emit(io, 'security.alert', data, { room: 'room:admin' }),
    sessionRevoked: (io, sessionId) => emit(io, 'session.revoked', { id: sessionId }),
  },

  // ─── BACKUPS ─────────────────────────────────────────────────
  backup: {
    started: (io, data) => emit(io, 'backup.started', data, { room: 'room:admin' }),
    completed: (io, backup) => emit(io, 'backup.completed', backup, { room: 'room:admin' }),
  },

  // ─── SETTINGS ────────────────────────────────────────────────
  settings: {
    updated: (io, data) => emit(io, 'settings.updated', data),
  },

  // ─── NOTIFICATIONS ───────────────────────────────────────────
  notification: {
    created: (io, notif) => emit(io, 'notification.created', notif),
    updated: (io, notif) => emit(io, 'notification.updated', notif),
    allRead: (io) => emit(io, 'notification.all_read', {}),
  },
};
