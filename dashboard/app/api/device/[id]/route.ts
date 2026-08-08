import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const token = await getBackendAuthToken()

    const action = String(body.action || '')
    let path = ''
    if (action === 'mark-stolen') {
      path = `/api/device/${id}/mark-stolen`
    } else if (action === 'recover') {
      path = `/api/device/${id}/recover`
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    const response = await backendFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: body.description }),
    }, token)
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Unable to update device' },
        { status: response.status }
      )
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Device action route error:', error)
    return NextResponse.json(
      { success: false, error: 'Unable to update device' },
      { status: 500 }
    )
  }
}