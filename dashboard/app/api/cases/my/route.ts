import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await backendFetch('/api/cases/my', { method: 'GET' }, token)

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      return NextResponse.json(payload || { error: 'Failed to fetch cases' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 })
  }
}
