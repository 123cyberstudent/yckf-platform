import { NextRequest, NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Evidence ID is required' }, { status: 400 })
    }

    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const response = await backendFetch(`/api/evidence/${id}/verify`, { method: 'GET' }, token)
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(data || { error: 'Verification failed' }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
