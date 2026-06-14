import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Modular Routers
import authRoutes from './modules/auth/auth.routes';
import posRoutes from './modules/pos/pos.routes';
import orderRoutes from './modules/orders/orders.routes';
import kitchenRoutes from './modules/kitchen/kitchen.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import reportsRoutes from './modules/reports/reports.routes';
import adminRoutes from './modules/admin/admin.routes';
import auditRoutes from './modules/audit/audit.routes';
import usersRoutes from './modules/users/users.routes';
import customersRoutes from './modules/customers/customers.routes';
import rolesRoutes from './modules/roles/roles.routes';
// Legacy/Other routes
import menuRoutes from './routes/menuRoutes';
import tableAdminRoutes from './routes/tableAdminRoutes';
import branchAdminRoutes from './routes/branchAdminRoutes';
import settingsRoutes from './routes/settingsRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import waiterRoutes from './modules/waiter/waiter.routes';
import supplierRoutes from './routes/supplierRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import paymentRoutes from './routes/paymentRoutes';
import customerDeliveryRoutes from './routes/customerDeliveryRoutes';

import { initSocketServer } from './realtime/socketServer';
import { errorHandler } from './shared/middlewares/errorHandler';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

// Initialize Enterprise Socket.IO with Redis Adapter
const io = initSocketServer(server);
app.set('io', io); // THIS FIXES ALL REAL-TIME SOCKET EMISSIONS

import prisma from './config/db';
import { initBackupScheduler } from './services/backupService';
initBackupScheduler(prisma, io);

if (!process.env.ALLOWED_ORIGINS) {
  console.error('CRITICAL ERROR: ALLOWED_ORIGINS environment variable is missing.');
  process.exit(1);
}

// --- 100/100 SECURITY MIDDLEWARES ---
app.use(helmet());
const allowedOrigins = process.env.ALLOWED_ORIGINS === '*' ? '*' : process.env.ALLOWED_ORIGINS.split(',');
app.use(cors({ origin: allowedOrigins }));
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
app.use((req: Request, res: Response, next: NextFunction) => {
  req.io = io;
  req.prisma = prisma;
  next();
});

// Modular Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/pos', posRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/kitchen', kitchenRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/customers', customersRoutes);
app.use('/api/v1/roles', rolesRoutes);
app.use('/api/v1/tables', tableAdminRoutes);
app.use('/api/branches', branchAdminRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/waiter', waiterRoutes);
app.use('/api/v1/supplier', supplierRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/delivery-system', customerDeliveryRoutes);

// Shared Global Error Handler
app.use(errorHandler);

// Legacy io.on removed. Real-time is managed by initSocketServer.

const PORT = Number(process.env.PORT || 5000);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[ERP] Modular Backend running on port ${PORT}`);
});
