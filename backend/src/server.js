const express = require('express');
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const { Server } = require('socket.io');

// Modular Routers
const authRoutes = require('./modules/auth/auth.routes');
const posRoutes = require('./modules/pos/pos.routes');
const orderRoutes = require('./modules/orders/orders.routes');
const kitchenRoutes = require('./modules/kitchen/kitchen.routes');

const { errorHandler } = require('./shared/middlewares/errorHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const prisma = new PrismaClient();

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

// Socket.IO Events for Real-Time Operations
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[ERP] Modular Backend running on port ${PORT}`);
});
