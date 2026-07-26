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
import investigatorsRouter from './investigators/routes.js';
import notificationsRouter from './notifications/routes.js';
import contentRouter from './content/routes.js';
import reportsRouter from './reports/routes.js';
import whatsappRouter from './whatsapp/routes.js';
import telegramRouter from './telegram/routes.js';
import volunteerRequestRouter from './volunteerRequest/routes.js';
import { siteStatsPublicRouter } from './admin/siteStats.js';
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

const csrfProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.origin || req.headers.referer;
    const authHeader = req.headers.authorization;
    if (!authHeader && origin) {
      const allowed = allowedOrigins.some((o) => origin.startsWith(o));
      if (!allowed) {
        return res.status(403).json({ error: 'CSRF: Invalid origin' });
      }
    }
  }
  next();
};
app.use(csrfProtection);
app.use((req, res, next) => {
  if (isProduction && req.headers['x-forwarded-proto'] !== 'https' && req.method === 'GET') {
    return res.redirect(`https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});
app.use(requestAuditLogger);
app.use(generalRateLimiter);

const uploadsAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required to access files' });
  }
  next();
};
app.use('/uploads', uploadsAuth, express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/site-stats', siteStatsPublicRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/audit', auditRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/investigators', investigatorsRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/email', emailRouter);
app.use('/api/entitlements', entitlementsRouter);
app.use('/api/content', contentRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/volunteer-request', volunteerRequestRouter);

app.get('/', (_req, res) => {
  res.json({
    name: 'YCKF Backend API',
    version: '0.1.0',
    health: '/api/health',
    docs: {
      auth: '/api/auth',
      users: '/api/users',
      investigators: '/api/investigators',
      incidents: '/api/incidents',
      evidence: '/api/evidence',
      notifications: '/api/notifications',
      analytics: '/api/analytics',
      admin: '/api/admin',
      coupons: '/api/coupons',
      email: '/api/email',
      entitlements: '/api/entitlements',
      content: '/api/content',
      reports: '/api/reports',
      whatsapp: '/api/whatsapp',
      telegram: '/api/telegram',
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
