/// <reference types="vite/client" />
import { io, Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;
  private static instance: SocketClient;

  private constructor() {}

  public static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  public connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Real-Time] Connected to ERP Backend:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.warn('[Real-Time] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err: Error) => {
      console.error('[Real-Time] Connection Error:', err.message);
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketClient = SocketClient.getInstance();
