import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken } from '@/lib/backend';

export async function GET(request: NextRequest) {
  try {
    const token = await getBackendAuthToken();
    if (!token) return NextResponse.json({ logs: [], total: 0, totalPages: 0 }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const res = await backendFetch(`/api/admin/login-logs${query ? `?${query}` : ''}`, { method: 'GET' }, token);
    if (!res.ok) return NextResponse.json({ logs: [], total: 0, totalPages: 0 }, { status: res.status });

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ logs: [], total: 0, totalPages: 0 }, { status: 500 });
  }
}
