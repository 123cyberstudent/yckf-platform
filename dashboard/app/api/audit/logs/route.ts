import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken } from '@/lib/backend';

export async function GET(req: NextRequest) {
  try {
    const token = await getBackendAuthToken();
    if (!token) return NextResponse.json([], { status: 200 });

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || '10';
    const userId = searchParams.get('userId');

    let path = `/api/audit/audit-logs?limit=${limit}`;
    if (userId) path += `&userId=${userId}`;

    const res = await backendFetch(path, { method: 'GET' }, token);
    if (!res.ok) return NextResponse.json([], { status: 200 });

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
