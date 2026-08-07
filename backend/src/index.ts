import './config/env.js';
import http from 'http';
import { env } from './config/env.js';
import app from './app.js';
import { initSocket } from './shared/socket.js';
import { initCache } from './shared/cache.js';
import { scheduleEvidenceRetention } from './evidence/retention.js';
import { startKeepAlive } from './shared/keepAlive.js';

const PORT = env.port;
const server = http.createServer(app);
const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()) ??
  ['http://localhost:3000', 'http://localhost:3001', 'https://yckf-admin-dashboard-production.up.railway.app'];

process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled promise rejection (server kept alive):', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[process] Uncaught exception (server kept alive):', error);
});

initSocket(server, allowedOrigins);
initCache().catch((error) => {
  console.error('Redis init failed:', error);
});
scheduleEvidenceRetention();
startKeepAlive();

server.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    process.stdout.write(`YCKF backend listening on http://localhost:${PORT}\n`);
  }
});
