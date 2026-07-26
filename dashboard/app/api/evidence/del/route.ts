import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Evidence ID is required' }, { status: 400 })
    }

    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const response = await backendFetch(`/api/evidence/${id}`, { method: 'DELETE' }, token)

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      return NextResponse.json({ error: payload?.error || 'Delete failed' }, { status: response.status })
    }

    return NextResponse.json({ success: true, message: 'Evidence deleted' })
  } catch (error) {
    console.error('Evidence delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
