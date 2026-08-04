import { NextRequest, NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'
import { requireSuperAdmin } from '@/lib/permissions-server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await requireSuperAdmin()
    if (denied) return denied
    const token = await getBackendAuthToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const response = await backendFetch(`/api/auth/staff/reset-requests/${id}/handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, token)

    const payload = await response.json().catch(() => null)
    return NextResponse.json(payload || { error: 'Failed to handle request' }, { status: response.status })
  } catch (error) {
    console.error('Handle password reset request error:', error)
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}
