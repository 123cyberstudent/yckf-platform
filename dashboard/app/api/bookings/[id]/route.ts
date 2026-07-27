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

    const payload: Record<string, any> = {}
    if (body.status) payload.status = body.status
    if (body.adminNotes !== undefined) payload.adminNotes = body.adminNotes
    if (body.assignedVolunteerId !== undefined) payload.assignedVolunteerId = body.assignedVolunteerId
    if (body.assignedSpecialistId !== undefined) payload.assignedSpecialistId = body.assignedSpecialistId

    const response = await backendFetch(`/api/bookings/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, token)
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json({ success: false, error: data?.error || 'Unable to update booking' }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Update booking error:', error)
    return NextResponse.json({ success: false, error: 'Unable to update booking' }, { status: 500 })
  }
}
