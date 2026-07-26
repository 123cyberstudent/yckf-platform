import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const token = await getBackendAuthToken()
    const response = await backendFetch(`/api/enquiries/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: body.status,
        adminNotes: body.adminNotes ?? undefined,
      }),
    }, token)
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json({ success: false, error: payload?.error || 'Unable to update enquiry' }, { status: response.status })
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Update enquiry status error:', error)
    return NextResponse.json({ success: false, error: 'Unable to update enquiry' }, { status: 500 })
  }
}
