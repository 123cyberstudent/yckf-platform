import { NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken } from '@/lib/backend';

export async function GET() {
  try {
    const token = await getBackendAuthToken();
    if (!token) return NextResponse.json({ configured: false });

    const res = await backendFetch('/api/email/status', { method: 'GET' }, token);
    if (!res.ok) return NextResponse.json({ configured: false });

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ configured: false });
  }
}
