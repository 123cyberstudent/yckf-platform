import { NextRequest, NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'
import { requireSuperAdmin } from '@/lib/permissions-server'

export async function GET(request: NextRequest) {
  try {
    const denied = await requireSuperAdmin()
    if (denied) return denied
    const token = await getBackendAuthToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const status = request.nextUrl.searchParams.get('status')
    const path = status
      ? `/api/auth/staff/reset-requests?status=${encodeURIComponent(status)}`
      : '/api/auth/staff/reset-requests'

    const response = await backendFetch(path, { method: 'GET' }, token)
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(payload || { error: 'Failed to load requests' }, { status: response.status })
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Password reset requests error:', error)
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}
