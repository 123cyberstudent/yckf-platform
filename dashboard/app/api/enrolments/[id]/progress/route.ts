import { NextRequest, NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const response = await backendFetch(
      `/api/enrolments/${id}/progress`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      token,
      { autoRefresh: true }
    )

    const payload = await response.json().catch(() => null)
    return NextResponse.json(payload || { error: 'Failed to update progress' }, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
  }
}
