import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken, mockResponse } from '@/lib/backend';

export async function GET(request: NextRequest) {
  try {
    const token = await getBackendAuthToken();
    if (!token) return mockResponse({ referrals: [], nextCursor: null, total: 0 }, 'No auth token');
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const res = await backendFetch(`/api/admin/referrals${query ? `?${query}` : ''}`, {}, token);
    if (!res.ok) return mockResponse({ referrals: [], nextCursor: null, total: 0 }, 'Backend unavailable');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return mockResponse({ referrals: [], nextCursor: null, total: 0 }, 'Backend unreachable');
  }
}
