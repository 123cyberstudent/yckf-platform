/**
 * Production health-check endpoint.
 *
 * Intentionally public and read-only so an external uptime monitor
 * (UptimeRobot / cron-job.org) can probe it every few minutes. It verifies
 * the application is alive and that critical dependencies (PostgreSQL via the
 * existing Prisma client, and the emergency-notification provider) are
 * reachable WITHOUT mutating any data or triggering any notification.
 *
 * Returns 200 when critical services are healthy, 503 when a critical
 * dependency such as the database is unavailable. Never leaks passwords,
 * keys, connection strings, environment variables or user data.
 */

import { Router } from 'express';
import { prisma } from '../shared/db.js';

const router = Router();

// Present (true) or absent (false) — never the raw key/value. Used only to
// report that the emergency-notification provider is configured.
const emergencyEmailProviderConfigured = Boolean(
  process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.EMAIL_FROM || process.env.SMTP_FROM
);

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
};

router.get('/', async (_req, res) => {
  const startedAt = Date.now();

  // Lightweight, non-mutating connectivity probe using the existing client.
  let databaseOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
  } catch (error) {
    // Log the detail server-side only; never expose internals publicly.
    console.error('[health] database probe failed:', error);
  }

  // The emergency-reporting path depends on the database (report persistence)
  // and on an email/push provider for admin notifications. We only report its
  // readiness from connectivity/config signals — nothing is sent or created.
  const emergencyServiceOk = databaseOk && emergencyEmailProviderConfigured;

  if (!databaseOk) {
    return res.status(503).set(noStoreHeaders).json({
      status: 'error',
      service: 'YCKF Backend',
      application: 'available',
      database: 'unavailable',
      emergencyService: emergencyServiceOk ? 'available' : 'unavailable',
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
    });
  }

  res.status(200).set(noStoreHeaders).json({
    status: 'ok',
    service: 'YCKF Backend',
    application: 'available',
    database: 'connected',
    emergencyService: emergencyServiceOk ? 'available' : 'unavailable',
    version: (
      process.env.RAILWAY_GIT_COMMIT_SHA ||
      process.env.RAILWAY_GIT_COMMIT_SHA_0 ||
      'unknown'
    ).slice(0, 7),
    timestamp: new Date().toISOString(),
    responseTimeMs: Date.now() - startedAt,
  });
});

export default router;