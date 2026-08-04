import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    const response = await backendFetch('/api/emergency-reports', { method: 'GET' }, token)
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Unable to load emergency reports' },
        { status: response.status }
      )
    }

    const items = Array.isArray(payload?.reports)
      ? payload.reports
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : []
    const mapped = items.map((report: any) => ({
      id: report.id?.toString() ?? 'unknown',
      ticketNumber: report.ticketNumber ?? report.ticket_number ?? `ER-${String(report.id).padStart(4, '0')}`,
      reporterName: report.reporterName ?? report.reporter_name ?? report.reporter?.fullName ?? 'Unknown',
      reporterPhone: report.reporterPhone ?? report.reporter_phone ?? report.reporter?.phone ?? '',
      nearestStation: report.nearestStation ?? report.nearest_station ?? report.stationName ?? report.station_name ?? report.stationAddress ?? '',
      gpsLatitude: report.gpsLatitude ?? report.gps_latitude ?? null,
      gpsLongitude: report.gpsLongitude ?? report.gps_longitude ?? null,
      audioFileUrl: report.audioFileUrl ?? report.audio_file_url ?? null,
      status: report.status ?? 'new',
      priority: report.priority ?? 'medium',
      submittedAt: report.submittedAt ?? report.submitted_at ?? report.createdAt ?? new Date().toISOString(),
      description: report.description ?? '',
    }))

    return NextResponse.json({ items: mapped })
  } catch (error) {
    console.error('Emergency reports route error:', error)
    return NextResponse.json(
      { success: false, error: 'Unable to load emergency reports' },
      { status: 500 }
    )
  }
}
