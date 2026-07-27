import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const token = await getBackendAuthToken()
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const response = await backendFetch(`/api/specialists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, token)
    const data = await response.json()
    if (!response.ok) return NextResponse.json(data, { status: response.status })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to update specialist' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = await getBackendAuthToken()
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const response = await backendFetch(`/api/specialists/${id}`, { method: 'DELETE' }, token)
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json(data, { status: response.status })
    }
    return NextResponse.json({ message: 'Specialist deactivated' })
  } catch {
    return NextResponse.json({ error: 'Failed to delete specialist' }, { status: 500 })
  }
}
