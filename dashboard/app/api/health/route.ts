import { NextResponse } from 'next/server';

// The public site serves /api/health and must answer both GET and HEAD since
// UptimeRobot probes with HEAD. It proxies to the Express backend's real
// health check (DB probe), so a meaningful status is returned. No data is
// mutated, no notifications sent, and no secrets are exposed.
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4001';

const HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

async function checkHealth() {
  const startedAt = Date.now();
  const defaultBody = {
    status: 'error',
    service: 'YCKF Backend',
    application: 'available',
    database: 'unavailable',
    emergencyService: 'unavailable',
    timestamp: new Date().toISOString(),
    responseTimeMs: Date.now() - startedAt,
  };

  try {
    const res = await fetch(`${BACKEND}/api/health`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      return { body: { ...defaultBody, responseTimeMs: Date.now() - startedAt }, status: res.status };
    }
    const data = await res.json();
    return {
      body: {
        ...data,
        application: 'available',
        responseTimeMs: Date.now() - startedAt,
      },
      status: 200,
    };
  } catch (error) {
    console.error('YCKF health check failed:', error);
    return { body: { ...defaultBody, responseTimeMs: Date.now() - startedAt }, status: 503 };
  }
}

export async function GET() {
  const result = await checkHealth();
  return NextResponse.json(result.body, { status: result.status, headers: HEADERS });
}

export async function HEAD() {
  const result = await checkHealth();
  return new NextResponse(null, { status: result.status, headers: HEADERS });
}