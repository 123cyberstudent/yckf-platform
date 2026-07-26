import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken, mockResponse } from '@/lib/backend';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('yckf-auth-token')?.value;
    if (!token) return mockResponse([], 'No auth token');
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const res = await backendFetch(`/api/admin/site-stats${query ? `?${query}` : ''}`, {}, token);
    if (!res.ok) return mockResponse([], 'Backend unavailable');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return mockResponse([], 'Backend unreachable');
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('yckf-auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const res = await backendFetch('/api/admin/site-stats', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
