import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function POST(request: Request) {
  try {
    const token = await getBackendAuthToken()
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const response = await backendFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token)

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
