const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Redis } = require('ioredis');
const jwt = require('jsonwebtoken');

const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const subClient = pubClient.duplicate();

let io;

const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.ALLOWED_ORIGINS || '*' },
  });

  // Attach Redis Adapter for Multi-Instance Horizontal Scaling
  io.adapter(createAdapter(pubClient, subClient));

  // Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication Error: Token missing'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication Error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id} (User: ${socket.user.id}, Role: ${socket.user.role})`);
    
    // Join Role-Based Rooms (e.g. 'room:kitchen', 'room:admin')
    socket.join(`room:${socket.user.role.toLowerCase()}`);
    // Join User-Specific Room
    socket.join(`user:${socket.user.id}`);

    // Load Handlers
    require('./socketHandlers/orders.handler')(io, socket);
    require('./socketHandlers/kitchen.handler')(io, socket);
    require('./socketHandlers/inventory.handler')(io, socket);

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

module.exports = { initSocketServer, getIO };
