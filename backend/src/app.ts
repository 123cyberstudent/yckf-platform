import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import authRouter from './auth/routes.js';
import usersRouter from './users/routes.js';
import auditRouter from './audit/routes.js';
import analyticsRouter from './analytics/routes.js';
import adminRouter from './admin/routes.js';
import couponsRouter from './coupons/routes.js';
import emailRouter from './email/routes.js';
import entitlementsRouter from './entitlements/routes.js';
import evidenceRouter from './evidence/routes.js';
import incidentsRouter from './incidents/routes.js';
import notificationsRouter from './notifications/routes.js';
import { generalRateLimiter } from './shared/rateLimiter.js';
import { requestAuditLogger } from './audit/middleware.js';

dotenv.config();

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()) ?? ['http://localhost:3000'];
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    crossOriginEmbedderPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    originAgentCluster: true,
  })
);
app.use(compression());
app.use(cors({ origin: allowedOrigins, credentials: true, optionsSuccessStatus: 200 }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  if (isProduction && req.headers['x-forwarded-proto'] !== 'https' && req.method === 'GET') {
    return res.redirect(`https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});
app.use(requestAuditLogger);
app.use(generalRateLimiter);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/audit', auditRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/email', emailRouter);
app.use('/api/entitlements', entitlementsRouter);

app.get('/', (_req, res) => {
  res.json({
    name: 'YCKF Backend API',
    version: '0.1.0',
    health: '/api/health',
    docs: {
      auth: '/api/auth',
      users: '/api/users',
      incidents: '/api/incidents',
      evidence: '/api/evidence',
      notifications: '/api/notifications',
      analytics: '/api/analytics',
      admin: '/api/admin',
      coupons: '/api/coupons',
      email: '/api/email',
      entitlements: '/api/entitlements',
    },
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(error);
  }
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
