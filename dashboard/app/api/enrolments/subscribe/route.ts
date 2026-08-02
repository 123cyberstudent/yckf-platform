import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function POST(request: Request) {
  try {
    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const response = await backendFetch(
      '/api/enrolments/subscribe',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      token,
      { autoRefresh: true }
    )

    const payload = await response.json().catch(() => null)
    return NextResponse.json(payload || { error: 'Failed to subscribe' }, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
