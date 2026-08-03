import { NextResponse } from 'next/server';
import { backendFetch, mockResponse } from '@/lib/backend';

export async function GET() {
  try {
    const res = await backendFetch('/api/subscriptions/plans');
    if (!res.ok) return mockResponse({ success: false, plans: [] }, 'Backend unavailable');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return mockResponse({ success: false, plans: [] }, 'Backend unreachable');
  }
}
