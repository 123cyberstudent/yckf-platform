import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    if (!token) return NextResponse.json([], { status: 401 })
    const response = await backendFetch('/api/specialists', { method: 'GET' }, token)
    if (!response.ok) return NextResponse.json([], { status: response.status })
    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = await getBackendAuthToken()
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const response = await backendFetch('/api/specialists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, token)
    const data = await response.json()
    if (!response.ok) return NextResponse.json(data, { status: response.status })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create specialist' }, { status: 500 })
  }
}
