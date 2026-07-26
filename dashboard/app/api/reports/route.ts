import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4001';

export async function GET(_req: NextRequest) {
  try {
    const cookieHeader = _req.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/yckf-auth-token=([^;]+)/);
    const headers: Record<string, string> = {};
    if (tokenMatch) headers['Authorization'] = `Bearer ${tokenMatch[1]}`;

    const res = await fetch(`${BACKEND}/api/reports`, { headers, cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
