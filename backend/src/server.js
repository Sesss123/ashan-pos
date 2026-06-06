const express = require('express');
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const { Server } = require('socket.io');

// Modular Routers
const authRoutes = require('./modules/auth/auth.routes');
const posRoutes = require('./modules/pos/pos.routes');
const orderRoutes = require('./modules/orders/orders.routes');
const kitchenRoutes = require('./modules/kitchen/kitchen.routes');

const { initSocketServer } = require('./realtime/socketServer');
const { errorHandler } = require('./shared/middlewares/errorHandler');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Initialize Enterprise Socket.IO with Redis Adapter
const io = initSocketServer(server);
const prisma = new PrismaClient();

// --- 100/100 SECURITY MIDDLEWARES ---
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200, 
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);
app.use(express.json());

// Inject Socket.IO & Prisma into requests
app.use((req, res, next) => {
  req.io = io;
  req.prisma = prisma;
  next();
});

// Modular Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/pos', posRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/kitchen', kitchenRoutes);

// Shared Global Error Handler
app.use(errorHandler);

// Legacy io.on removed. Real-time is managed by initSocketServer.

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[ERP] Modular Backend running on port ${PORT}`);
});
