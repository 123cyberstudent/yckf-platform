import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken, mockResponse } from '@/lib/backend';

export async function GET(request: NextRequest) {
  try {
    const token = await getBackendAuthToken();
    if (!token) return mockResponse({ packages: [], total: 0 }, 'No auth token');
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === '1';
    const query = includeInactive ? '?includeInactive=1' : '';
    const res = await backendFetch(`/api/admin/packages${query}`, {}, token);
    if (!res.ok) return mockResponse({ packages: [], total: 0 }, 'Backend unavailable');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return mockResponse({ packages: [], total: 0 }, 'Backend unreachable');
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getBackendAuthToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const res = await backendFetch('/api/admin/packages', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
