import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken } from '@/lib/backend';

export async function GET(request: NextRequest) {
  try {
    const token = await getBackendAuthToken();
    if (!token) return NextResponse.json({ valid: false, message: 'Not authenticated' });
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (!code) return NextResponse.json({ valid: false, message: 'Code required' });
    const res = await backendFetch(`/api/coupons/validate?code=${encodeURIComponent(code)}`, {}, token);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ valid: false, message: 'Backend unreachable' });
  }
}
