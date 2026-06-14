const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocketServer = (httpServer) => {
  if (!process.env.ALLOWED_ORIGINS) {
    console.warn('WARNING: ALLOWED_ORIGINS is not set in .env. Falling back to localhost for development.');
  }
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://localhost:3000'];

  io = new Server(httpServer, {
    cors: { origin: allowedOrigins },
    // Performance: use WebSocket transport first, fallback to polling
    transports: ['websocket', 'polling'],
  });

  // Authentication Middleware — verifies JWT before socket connection is accepted
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication Error: Token missing'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication Error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role, branchId, tenantId } = socket.user;
    console.log(`[Socket ⚡] Connected: ${socket.id} | User: ${userId} | Role: ${role} | Branch: ${branchId || 'global'} | Tenant: ${tenantId || 'global'}`);
    
    // ── ROOM STRATEGY (SaaS Multi-Tenant) ──────────────────────
    const tenantPrefix = tenantId ? `tenant:${tenantId}:` : '';
    
    // 1. Role-based room: admins, cashiers, waiters, kitchen staff
    socket.join(`${tenantPrefix}room:${role.toLowerCase()}`);
    
    // 2. User-specific room: for targeted personal events
    socket.join(`${tenantPrefix}user:${userId}`);
    
    // 3. Branch-specific room: for multi-branch data isolation
    if (branchId) {
      socket.join(`${tenantPrefix}branch:${branchId}`);
      socket.join(`${tenantPrefix}branch:${branchId}:${role.toLowerCase()}`);
    }
    
    // 4. Role-specific semantic room: for permission-change notifications
    socket.join(`${tenantPrefix}role:${role.toLowerCase()}`);
    // ────────────────────────────────────────────────────────────

    // Load event-based handlers (client → server actions)
    require('./socketHandlers/orders.handler')(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
    });

    // Ping/pong health check from clients
    socket.on('ping', () => socket.emit('pong', { ts: Date.now() }));
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

export { initSocketServer, getIO };
