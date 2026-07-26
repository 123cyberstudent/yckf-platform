import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const token = await getBackendAuthToken()

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await backendFetch(`/api/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, token)

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return NextResponse.json({ error: err.error || 'Failed to update member' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Members PUT error:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await getBackendAuthToken()

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await backendFetch(`/api/members/${id}`, {
      method: 'DELETE',
    }, token)

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return NextResponse.json({ error: err.error || 'Failed to delete member' }, { status: response.status })
    }

    return NextResponse.json({ success: true, message: 'Member deleted successfully' })
  } catch (error) {
    console.error('Members DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 })
  }
}
