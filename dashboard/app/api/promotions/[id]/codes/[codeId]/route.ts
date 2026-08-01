import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken } from '@/lib/backend';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; codeId: string }> }
) {
  try {
    const token = await getBackendAuthToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, codeId } = await params;
    const res = await backendFetch(`/api/admin/promotions/${id}/codes/${codeId}`, {
      method: 'DELETE',
    }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
