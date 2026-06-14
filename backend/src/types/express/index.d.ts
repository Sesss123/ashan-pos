import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';

declare global {
  namespace Express {
    interface Request {
      prisma: PrismaClient;
      io: Server;
    }
  }
}
