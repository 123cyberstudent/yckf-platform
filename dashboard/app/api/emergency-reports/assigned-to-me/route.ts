import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    const response = await backendFetch('/api/emergency-reports/assigned-to-me', { method: 'GET' }, token)
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Unable to load assigned reports' },
        { status: response.status }
      )
    }

    return NextResponse.json({ reports: payload?.reports ?? [] })
  } catch (error) {
    console.error('Assigned-to-me route error:', error)
    return NextResponse.json(
      { success: false, error: 'Unable to load assigned reports' },
      { status: 500 }
    )
  }
}
