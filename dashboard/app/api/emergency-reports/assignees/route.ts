import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    const response = await backendFetch('/api/emergency-reports/assignees', { method: 'GET' }, token)
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Unable to load assignees' },
        { status: response.status }
      )
    }

    return NextResponse.json({ assignees: payload?.assignees ?? [] })
  } catch (error) {
    console.error('Emergency assignees route error:', error)
    return NextResponse.json(
      { success: false, error: 'Unable to load assignees' },
      { status: 500 }
    )
  }
}
