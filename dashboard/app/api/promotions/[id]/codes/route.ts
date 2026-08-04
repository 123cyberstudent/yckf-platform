import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken, mockResponse } from '@/lib/backend';
import { requireSuperAdmin } from '@/lib/permissions-server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await requireSuperAdmin();
    if (denied) return denied;
    const token = await getBackendAuthToken();
    if (!token) return mockResponse({ codes: [] }, 'No auth token');
    const { id } = await params;
    const res = await backendFetch(`/api/admin/promotions/${id}/codes`, {}, token);
    if (!res.ok) return mockResponse({ codes: [] }, 'Backend unavailable');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return mockResponse({ codes: [] }, 'Backend unreachable');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await requireSuperAdmin();
    if (denied) return denied;
    const token = await getBackendAuthToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const res = await backendFetch(`/api/admin/promotions/${id}/codes`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
