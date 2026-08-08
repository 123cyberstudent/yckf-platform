import { describe, it, expect } from 'vitest';
import http from 'http';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import app from '../src/app.js';
import { createHealthRouter } from '../src/health/routes.js';

// This suite represents the healthy/connected-database contract. It only runs
// when a real PostgreSQL is available (CI provides one via the postgres service
// container; local runs use the dev DATABASE_URL). It never weakens the
// production readiness check — it must see HTTP 200 + connected DB.
const hasDb = Boolean(process.env.DATABASE_URL);

function listen(server: http.Server) {
  return new Promise<number>((resolve) => {
    server.listen(0, () => resolve((server.address() as any).port));
  });
}

async function startApp() {
  return http.createServer(app);
}

describe.skipIf(!hasDb)('health endpoint (database connected)', () => {
  it('returns 200 with connected db and no-store headers', async () => {
    const s = await startApp();
    const port = await listen(s);
    try {
      const r = await fetch(`http://localhost:${port}/api/health`);
      const body = await r.json();
      expect(r.status).toBe(200);
      expect(r.headers.get('cache-control')).toContain('no-store');
      expect(body.status).toBe('ok');
      expect(body.application).toBe('available');
      expect(body.database).toBe('connected');
      expect(['available', 'unavailable']).toContain(body.emergencyService);
      expect(body.service).toBe('YCKF Backend');
      expect(typeof body.responseTimeMs).toBe('number');
      expect(body).not.toHaveProperty('databaseUrl');
      expect(body).not.toHaveProperty('apiKey');
    } finally {
      s.close();
    }
  });
});

describe('health endpoint (database unavailable)', () => {
  it('returns 503 with unavailable db and no-store headers when PostgreSQL is unreachable', async () => {
    // Inject a client whose probe always fails, simulating a down database.
    const brokenPrisma = new PrismaClient({
      datasourceUrl: 'postgresql://nobody:invalid@127.0.0.1:1/yckf_test?connect_timeout=1',
    });
    const brokenApp = express();
    brokenApp.use('/api/health', createHealthRouter(brokenPrisma));

    const s = http.createServer(brokenApp);
    const port = await listen(s);
    try {
      const r = await fetch(`http://localhost:${port}/api/health`);
      const body = await r.json();
      expect(r.status).toBe(503);
      expect(r.headers.get('cache-control')).toContain('no-store');
      expect(body.database).toBe('unavailable');
      expect(body.application).toBe('available');
      expect(body.service).toBe('YCKF Backend');
      expect(typeof body.responseTimeMs).toBe('number');
      expect(body).not.toHaveProperty('databaseUrl');
      expect(body).not.toHaveProperty('apiKey');
    } finally {
      s.close();
      await brokenPrisma.$disconnect().catch(() => undefined);
    }
  });
});