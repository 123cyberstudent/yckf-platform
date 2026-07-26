import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    if (!token) return NextResponse.json({ twoFaEnabled: false })

    const response = await backendFetch('/api/auth/2fa/status', {}, token)
    if (!response.ok) return NextResponse.json({ twoFaEnabled: false })
    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ twoFaEnabled: false })
  }
}

export async function POST(request: Request) {
  try {
    const token = await getBackendAuthToken()
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const { action } = body

    if (action === 'enable') {
      const response = await backendFetch('/api/auth/2fa/setup', { method: 'POST', body: JSON.stringify(body) }, token)
      const data = await response.json()
      return NextResponse.json(data, { status: response.status })
    }

    if (action === 'disable') {
      const response = await backendFetch('/api/auth/2fa/disable', { method: 'POST', body: JSON.stringify(body) }, token)
      const data = await response.json()
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
