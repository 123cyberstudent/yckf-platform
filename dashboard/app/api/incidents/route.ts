import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    const response = await backendFetch('/api/incidents', { method: 'GET' }, token)
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json({ success: false, error: payload?.error || 'Unable to load incidents' }, { status: response.status })
    }

    const items = Array.isArray(payload?.cases) ? payload.cases : payload?.items ?? []
    const mapped = items.map((incident: any) => ({
      id: incident.id?.toString() ?? 'unknown',
      title: incident.report?.title ?? incident.title ?? 'Untitled incident',
      description: incident.report?.description ?? incident.description ?? '',
      type: incident.report?.incidentType ?? incident.type ?? 'other',
      category: incident.report?.incidentType ?? incident.type ?? 'other',
      severity: incident.report?.priority ?? incident.severity ?? 'medium',
      priority: incident.report?.priority ?? incident.priority ?? 'medium',
      status: incident.status ?? 'open',
      assignedTo: incident.assignedInvestigator?.id?.toString() ?? incident.assignedTo,
      assignedToName: incident.assignedInvestigator?.fullName ?? incident.assignedToName,
      reportedBy: incident.report?.userId?.toString() ?? incident.reportedBy,
      reportedByName: incident.report?.reporterName ?? incident.report?.user?.fullName ?? incident.reportedByName ?? 'Unknown',
      createdAt: incident.createdAt ?? new Date().toISOString(),
      updatedAt: incident.updatedAt ?? incident.createdAt ?? new Date().toISOString(),
      resolvedAt: incident.resolvedAt ?? null,
      notes: (incident.notes ?? []).map((note: any) => ({
        id: note.id?.toString() ?? 'note',
        incidentId: incident.id?.toString() ?? 'unknown',
        authorId: note.author?.id?.toString() ?? 'unknown',
        authorName: note.author?.fullName ?? note.authorName ?? 'Unknown',
        content: note.note ?? note.content ?? '',
        createdAt: note.createdAt ?? new Date().toISOString(),
      })),
      timeline: [],
      assignmentHistory: [],
    }))

    return NextResponse.json({ items: mapped })
  } catch (error) {
    console.error('Incidents route error:', error)
    return NextResponse.json({ success: false, error: 'Unable to load incidents' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = await getBackendAuthToken()
    const response = await backendFetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: body.title,
        description: body.description,
        incidentType: body.type ?? body.incidentType ?? 'other',
        priority: body.priority ?? 'medium',
        location: body.location ?? 'Unknown',
      }),
    }, token)
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json({ success: false, error: payload?.error || 'Unable to create incident' }, { status: response.status })
    }

    return NextResponse.json(payload, { status: 201 })
  } catch (error) {
    console.error('Create incident error:', error)
    return NextResponse.json({ success: false, error: 'Unable to create incident' }, { status: 500 })
  }
}
