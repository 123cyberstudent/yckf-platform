import { NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken, mockResponse } from '@/lib/backend';

export async function GET() {
  try {
    const token = await getBackendAuthToken();
    if (!token) return mockResponse({ redemptions: [], total: 0 }, 'No auth token');
    const res = await backendFetch('/api/admin/redemptions', {}, token);
    if (!res.ok) return mockResponse({ redemptions: [], total: 0 }, 'Backend unavailable');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return mockResponse({ redemptions: [], total: 0 }, 'Backend unreachable');
  }
}
