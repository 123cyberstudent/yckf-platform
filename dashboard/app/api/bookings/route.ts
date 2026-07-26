import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    const response = await backendFetch('/api/bookings', { method: 'GET' }, token)
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json({ success: false, error: payload?.error || 'Unable to load bookings' }, { status: response.status })
    }

    const items = Array.isArray(payload?.bookings) ? payload.bookings : payload?.items ?? []
    const mapped = items.map((booking: any) => ({
      id: booking.id?.toString() ?? 'unknown',
      ticketNumber: booking.ticketNumber ?? booking.ticket_number ?? '',
      fullName: booking.fullName ?? booking.full_name ?? '',
      email: booking.email ?? '',
      phone: booking.phone ?? '',
      specialist: booking.specialist ?? '',
      preferredDate: booking.preferredDate ?? booking.preferred_date ?? '',
      preferredTime: booking.preferredTime ?? booking.preferred_time ?? '',
      status: booking.status ?? 'new',
      message: booking.message ?? '',
      createdAt: booking.createdAt ?? new Date().toISOString(),
      updatedAt: booking.updatedAt ?? booking.createdAt ?? new Date().toISOString(),
    }))

    return NextResponse.json({ items: mapped })
  } catch (error) {
    console.error('Bookings route error:', error)
    return NextResponse.json({ success: false, error: 'Unable to load bookings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = await getBackendAuthToken()
    const response = await backendFetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        specialist: body.specialist,
        preferredDate: body.preferredDate,
        preferredTime: body.preferredTime,
        message: body.message,
      }),
    }, token)
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json({ success: false, error: payload?.error || 'Unable to create booking' }, { status: response.status })
    }

    return NextResponse.json(payload, { status: 201 })
  } catch (error) {
    console.error('Create booking error:', error)
    return NextResponse.json({ success: false, error: 'Unable to create booking' }, { status: 500 })
  }
}
