import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/permissions-server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4001';

function extractToken(req: NextRequest): string | null {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/yckf-auth-token=([^;]+)/);
  return match ? match[1] : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const res = await fetch(`${BACKEND}/api/content/${slug}`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const denied = await requireSuperAdmin();
    if (denied) return denied;
    const { slug } = await params;
    const body = await req.json();
    const token = extractToken(req);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BACKEND}/api/content/${slug}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
