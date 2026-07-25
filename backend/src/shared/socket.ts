import { Server, type Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-do-not-use-in-production';
let io: Server | null = null;
const userSocketMap = new Map<number, Set<string>>();

export function initSocket(server: import('http').Server, allowedOrigins: string[]) {
  const options = {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
    },
  } as any;

  io = new Server(server, options as any);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.toString().replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as unknown as { sub: number; role: string; email?: string; type?: string };
      if (payload.type !== 'access') {
        return next(new Error('Invalid token type'));
      }
      socket.data.userId = Number(payload.sub);
      socket.data.role = payload.role;
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = Number(socket.data.userId);
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId)?.add(socket.id);

    socket.on('disconnect', () => {
      const sockets = userSocketMap.get(userId);
      sockets?.delete(socket.id);
      if (sockets && sockets.size === 0) {
        userSocketMap.delete(userId);
      }
    });
  });
}

export function emitToUser(userId: number, event: string, payload: unknown) {
  if (!io) return;
  const sockets = userSocketMap.get(userId);
  if (!sockets) return;
  sockets.forEach((socketId) => io?.to(socketId).emit(event, payload));
}

export function emitToAll(event: string, payload: unknown) {
  if (!io) return;
  io.emit(event, payload);
}

export function getActiveUsersCount() {
  return userSocketMap.size;
}
