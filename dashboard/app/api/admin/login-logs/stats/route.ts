import { NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken } from '@/lib/backend';

export async function GET() {
  try {
    const token = await getBackendAuthToken();
    if (!token) return NextResponse.json({ total: 0, successful: 0, failed: 0, uniqueUsers: 0 }, { status: 401 });

    const res = await backendFetch('/api/admin/login-logs/stats', { method: 'GET' }, token);
    if (!res.ok) return NextResponse.json({ total: 0, successful: 0, failed: 0, uniqueUsers: 0 }, { status: res.status });

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ total: 0, successful: 0, failed: 0, uniqueUsers: 0 }, { status: 500 });
  }
}
