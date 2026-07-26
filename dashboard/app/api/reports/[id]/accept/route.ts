import { NextRequest, NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const response = await backendFetch(`/api/reports/${id}/accept`, { method: 'POST' }, token)

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      return NextResponse.json(payload || { error: 'Failed to accept case' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Failed to accept case' }, { status: 500 })
  }
}
