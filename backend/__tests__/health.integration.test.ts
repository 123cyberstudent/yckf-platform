import { describe, it, expect } from 'vitest';
import http from 'http';
import app from '../src/app.js';

function listen() {
  return new Promise<number>((resolve) => {
    const s = http.createServer(app).listen(0, () => resolve((s.address() as any).port));
  });
}

describe('health endpoint', () => {
  it('returns 200 with connected db and no-store headers', async () => {
    const port = await listen();
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
  });
});