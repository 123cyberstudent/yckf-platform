import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken, mockResponse } from '@/lib/backend';

export async function GET() {
  try {
    const token = await getBackendAuthToken();
    if (!token) return mockResponse({ plans: [] }, 'No auth token');
    const res = await backendFetch('/api/admin/subscription-plans', {}, token);
    if (!res.ok) return mockResponse({ plans: [] }, 'Backend unavailable');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return mockResponse({ plans: [] }, 'Backend unreachable');
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getBackendAuthToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const res = await backendFetch('/api/admin/subscription-plans', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
