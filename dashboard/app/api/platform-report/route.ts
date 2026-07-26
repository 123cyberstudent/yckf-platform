import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const response = await backendFetch('/api/analytics/platform-report', { method: 'GET' }, token)

    if (!response.ok) {
      return NextResponse.json({ error: 'Backend error' }, { status: response.status })
    }

    const payload = await response.json().catch(() => null)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Platform report proxy error:', error)
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 })
  }
}
