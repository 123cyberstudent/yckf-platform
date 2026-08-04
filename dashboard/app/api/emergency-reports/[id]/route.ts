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

    const response = await backendFetch(
      `/api/emergency-reports/${id}/status`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: body.status }),
      },
      token
    )
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Unable to update status' },
        { status: response.status }
      )
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Update emergency report status error:', error)
    return NextResponse.json(
      { success: false, error: 'Unable to update status' },
      { status: 500 }
    )
  }
}

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
    if (action === 'assign') {
      path = `/api/emergency-reports/${id}/assign`
    } else if (action === 'unassign') {
      path = `/api/emergency-reports/${id}/unassign`
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    const response = await backendFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, token)
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Unable to update assignment' },
        { status: response.status }
      )
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Emergency report assignment error:', error)
    return NextResponse.json(
      { success: false, error: 'Unable to update assignment' },
      { status: 500 }
    )
  }
}
