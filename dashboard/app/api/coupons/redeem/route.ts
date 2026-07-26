import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken } from '@/lib/backend';

export async function POST(request: NextRequest) {
  try {
    const token = await getBackendAuthToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const res = await backendFetch('/api/coupons/redeem', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
