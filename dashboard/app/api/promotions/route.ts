import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken, mockResponse } from '@/lib/backend';
import { requireSuperAdmin } from '@/lib/permissions-server';

export async function GET(request: NextRequest) {
  try {
    const denied = await requireSuperAdmin();
    if (denied) return denied;
    const token = await getBackendAuthToken();
    if (!token) return mockResponse({ promotions: [], total: 0 }, 'No auth token');
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const res = await backendFetch(`/api/admin/promotions${query ? `?${query}` : ''}`, {}, token);
    if (!res.ok) return mockResponse({ promotions: [], total: 0 }, 'Backend unavailable');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return mockResponse({ promotions: [], total: 0 }, 'Backend unreachable');
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireSuperAdmin();
    if (denied) return denied;
    const token = await getBackendAuthToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const res = await backendFetch('/api/admin/promotions', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
