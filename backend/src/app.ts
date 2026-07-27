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
import auditExportLogRouter from './audit/exportLog.js';
import analyticsRouter from './analytics/routes.js';
import platformReportRouter from './analytics/platformReport.js';
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
import casesRouter from './cases/routes.js';
import whatsappRouter from './whatsapp/routes.js';
import telegramRouter from './telegram/routes.js';
import membersRouter from './members/routes.js';
import volunteerRequestRouter from './volunteerRequest/routes.js';
import emergencyReportsRouter from './emergencyReports/routes.js';
import bookingsRouter from './bookings/routes.js';
import enquiriesRouter from './enquiries/routes.js';
import siemRouter from './siem/routes.js';
import specialistsRouter from './specialists/routes.js';
import { siteStatsPublicRouter } from './admin/siteStats.js';
import { generalRateLimiter } from './shared/rateLimiter.js';
import { requestAuditLogger } from './audit/middleware.js';

dotenv.config();

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()) ?? [
  'http://localhost:3000',
  'http://localhost:4001',
];
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: false,
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
  })
);
app.use(compression());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

const csrfProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.origin || req.headers.referer;
    const authHeader = req.headers.authorization;
    const userAgent = req.headers['user-agent'] || '';
    const isMobileApp = userAgent.includes('okhttp') || userAgent.includes('Expo') || userAgent.includes('ReactNative');
    if (!authHeader && origin && !isMobileApp) {
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

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  service: 'YCKF Backend API',
  version: '0.1.0',
  timestamp: new Date().toISOString(),
}));
app.use('/api/site-stats', siteStatsPublicRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/audit', auditRouter);
app.use('/api/audit', auditExportLogRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/investigators', investigatorsRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/analytics', platformReportRouter);
app.use('/api/email', emailRouter);
app.use('/api/entitlements', entitlementsRouter);
app.use('/api/content', contentRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/cases', casesRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/members', membersRouter);
app.use('/api/volunteer-request', volunteerRequestRouter);
app.use('/api/emergency-reports', emergencyReportsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/enquiries', enquiriesRouter);
app.use('/api/siem', siemRouter);
app.use('/api/specialists', specialistsRouter);

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
