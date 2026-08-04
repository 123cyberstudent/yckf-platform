import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken, mockResponse } from '@/lib/backend';

export async function GET(request: NextRequest, context: { params: Promise<{ orderNumber: string }> }) {
  try {
    const token = await getBackendAuthToken();
    if (!token) return mockResponse({ order: null }, 'No auth token');
    const { orderNumber } = await context.params;
    const res = await backendFetch(`/api/admin/orders/${orderNumber}`, {}, token);
    if (!res.ok) return mockResponse({ order: null }, 'Backend unavailable');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return mockResponse({ order: null }, 'Backend unreachable');
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ orderNumber: string }> }) {
  try {
    const token = await getBackendAuthToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { orderNumber } = await context.params;
    const body = await request.json();
    const action = String(body.action || '');
    if (!['fulfill', 'cancel', 'refund'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    const res = await backendFetch(`/api/admin/orders/${orderNumber}/${action}`, {
      method: 'POST',
      body: JSON.stringify({}),
    }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
