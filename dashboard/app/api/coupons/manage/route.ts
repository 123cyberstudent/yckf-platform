import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken } from '@/lib/backend';
import { requireSuperAdmin } from '@/lib/permissions-server';

export async function POST(request: NextRequest) {
  try {
    const denied = await requireSuperAdmin();
    if (denied) return denied;
    const token = await getBackendAuthToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const { action, ...payload } = body;
    let path = '/api/admin/coupons/';
    if (action === 'deactivate') path += 'deactivate';
    else if (action === 'reactivate') path += 'reactivate';
    else if (action === 'delete') path += 'delete';
    else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    const res = await backendFetch(path, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
