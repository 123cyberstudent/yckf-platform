import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    const response = await backendFetch('/api/enquiries', { method: 'GET' }, token)
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json({ success: false, error: payload?.error || 'Unable to load enquiries' }, { status: response.status })
    }

    const items = Array.isArray(payload?.enquiries) ? payload.enquiries : payload?.items ?? []
    const mapped = items.map((enquiry: any) => ({
      id: enquiry.id?.toString() ?? 'unknown',
      ticketNumber: enquiry.ticketNumber ?? `ENQ-${enquiry.id}`,
      name: enquiry.name ?? enquiry.fullName ?? 'Unknown',
      email: enquiry.email ?? '',
      phone: enquiry.phone ?? '',
      subject: enquiry.subject ?? enquiry.title ?? '',
      message: enquiry.message ?? enquiry.description ?? '',
      channel: enquiry.channel ?? 'web',
      status: enquiry.status ?? 'new',
      adminNotes: enquiry.adminNotes ?? '',
      createdAt: enquiry.createdAt ?? new Date().toISOString(),
      updatedAt: enquiry.updatedAt ?? enquiry.createdAt ?? new Date().toISOString(),
    }))

    return NextResponse.json({ items: mapped })
  } catch (error) {
    console.error('Enquiries route error:', error)
    return NextResponse.json({ success: false, error: 'Unable to load enquiries' }, { status: 500 })
  }
}
