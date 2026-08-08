import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

interface BackendEmergencyReport {
  id?: number | string
  ticketNumber?: string
  ticket_number?: string
  reporterName?: string
  reporter_name?: string
  reporter?: { fullName?: string; phone?: string; email?: string }
  reporterPhone?: string
  reporter_phone?: string
  reporterEmail?: string
  reporter_email?: string
  nearestStation?: string
  nearest_station?: string
  stationName?: string
  station_name?: string
  stationAddress?: string
  station_address?: string
  stationDistance?: number | string | null
  station_distance?: number | string | null
  incidentType?: string
  incident_type?: string
  mapsLink?: string
  maps_link?: string
  gpsLatitude?: number | string | null
  gps_latitude?: number | string | null
  gpsLongitude?: number | string | null
  gps_longitude?: number | string | null
  gpsAddress?: string
  gps_address?: string
  gpsAccuracy?: number | string | null
  gps_accuracy?: number | string | null
  audioFileUrl?: string
  audio_file_url?: string
  audioDuration?: number | null
  audio_duration?: number | null
  stationPhone?: string
  station_phone?: string
  status?: string
  priority?: string
  submittedAt?: string
  submitted_at?: string
  createdAt?: string
  description?: string
  assignedVolunteerId?: string | null
  assignedAt?: string | null
  dueAt?: string | null
  assignedBy?: string | null
  assignmentHistory?: unknown[]
}

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
    const mapped = items.map((report: BackendEmergencyReport) => ({
      id: report.id?.toString() ?? 'unknown',
      ticketNumber: report.ticketNumber ?? report.ticket_number ?? `ER-${String(report.id).padStart(4, '0')}`,
      reporterName: report.reporterName ?? report.reporter_name ?? report.reporter?.fullName ?? 'Unknown',
      reporterPhone: report.reporterPhone ?? report.reporter_phone ?? report.reporter?.phone ?? '',
      reporterEmail: report.reporterEmail ?? report.reporter_email ?? '',
      nearestStation: report.nearestStation ?? report.nearest_station ?? report.stationName ?? report.station_name ?? report.stationAddress ?? '',
      stationDistance: report.stationDistance ?? report.station_distance ?? null,
      incidentType: report.incidentType ?? report.incident_type ?? null,
      mapsLink: report.mapsLink ?? report.maps_link ?? null,
      gpsLatitude: report.gpsLatitude ?? report.gps_latitude ?? null,
      gpsLongitude: report.gpsLongitude ?? report.gps_longitude ?? null,
      gpsAddress: report.gpsAddress ?? report.gps_address ?? null,
      gpsAccuracy: report.gpsAccuracy ?? report.gps_accuracy ?? null,
      audioFileUrl: report.audioFileUrl ?? report.audio_file_url ?? null,
      audioDuration: report.audioDuration ?? report.audio_duration ?? null,
      stationPhone: report.stationPhone ?? report.station_phone ?? null,
      stationAddress: report.stationAddress ?? report.station_address ?? null,
      status: report.status ?? 'new',
      priority: report.priority ?? 'medium',
      submittedAt: report.submittedAt ?? report.submitted_at ?? report.createdAt ?? new Date().toISOString(),
      description: report.description ?? '',
      assignedVolunteerId: report.assignedVolunteerId ?? null,
      assignedAt: report.assignedAt ?? null,
      dueAt: report.dueAt ?? null,
      assignedBy: report.assignedBy ?? null,
      assignmentHistory: report.assignmentHistory ?? [],
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
