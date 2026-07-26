import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken, mockResponse } from '@/lib/backend';

export async function GET(request: NextRequest) {
  try {
    const token = await getBackendAuthToken();
    if (!token) return mockResponse({ totalAssigned: 0, casesByStatus: {}, resolvedThisMonth: 0, resolvedThisYear: 0, avgResolutionTimeHours: 0, recentActivity: [] }, 'No auth token');
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const res = await backendFetch(`/api/admin/volunteer-stats${query ? `?${query}` : ''}`, { method: 'GET' }, token);
    if (!res.ok) return mockResponse({ totalAssigned: 0, casesByStatus: {}, resolvedThisMonth: 0, resolvedThisYear: 0, avgResolutionTimeHours: 0, recentActivity: [] }, 'Backend unavailable');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return mockResponse({ totalAssigned: 0, casesByStatus: {}, resolvedThisMonth: 0, resolvedThisYear: 0, avgResolutionTimeHours: 0, recentActivity: [] }, 'Backend unreachable');
  }
}
