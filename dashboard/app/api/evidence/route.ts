import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken, toIsoString } from '@/lib/backend'

interface BackendEvidenceItem {
  id?: number | string
  reportId?: number | string
  incidentId?: number | string
  report?: { title?: string }
  incidentTitle?: string
  metadata?: {
    originalName?: string
    size?: number
    description?: string
  }
  filename?: string
  fileUrl?: string
  fileType?: string
  fileSize?: number
  fileHash?: string
  hash?: string
  uploadedById?: number | string
  uploadedBy?: { fullName?: string }
  uploadedByName?: string
  uploadedAt?: string | Date | null
  createdAt?: string | Date | null
  description?: string
  chainOfCustody?: unknown[]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const incidentId = searchParams.get('incidentId')
    const token = await getBackendAuthToken()

    if (!token) {
      return NextResponse.json([], { status: 200 })
    }

    const response = await backendFetch('/api/evidence', { method: 'GET' }, token)

    if (response.status === 401) {
      const { clearBackendAuthCookie } = await import('@/lib/backend')
      await clearBackendAuthCookie()
      return NextResponse.json([], { status: 200 })
    }

    if (!response.ok) {
      return NextResponse.json([], { status: 200 })
    }

    const payload = await response.json().catch(() => null)
    if (!payload) return NextResponse.json([], { status: 200 })

    let items: BackendEvidenceItem[] = []
    if (Array.isArray(payload)) {
      items = payload
    } else if (Array.isArray(payload?.evidence)) {
      items = payload.evidence
    } else if (Array.isArray(payload?.items)) {
      items = payload.items
    } else if (payload?.data && Array.isArray(payload.data)) {
      items = payload.data
    }

    if (incidentId) {
      items = items.filter((item: BackendEvidenceItem) =>
        item.reportId?.toString() === incidentId || item.incidentId?.toString() === incidentId
      )
    }

    return NextResponse.json(items.map((item: BackendEvidenceItem) => ({
      id: item.id?.toString() ?? `evd-${Date.now()}-${Math.random()}`,
      incidentId: item.reportId?.toString() ?? item.incidentId?.toString() ?? 'unknown',
      incidentTitle: item.report?.title ?? item.incidentTitle ?? 'Case evidence',
      filename: item.metadata?.originalName ?? item.filename ?? item.fileUrl ?? 'evidence',
      fileType: item.fileType ?? 'application/octet-stream',
      fileSize: item.metadata?.size ?? item.fileSize ?? 0,
      hash: item.fileHash ?? item.hash ?? '',
      uploadedBy: item.uploadedById?.toString() ?? item.uploadedBy ?? 'unknown',
      uploadedByName: item.uploadedBy?.fullName ?? item.uploadedByName ?? 'Unknown',
      uploadedAt: toIsoString(item.uploadedAt) ?? toIsoString(item.createdAt) ?? new Date().toISOString(),
      description: item.metadata?.description ?? item.description ?? '',
      chainOfCustody: item.chainOfCustody ?? [
        {
          id: `upload-${item.id ?? Date.now()}`,
          action: 'Evidence uploaded',
          performedBy: item.uploadedById?.toString() ?? 'unknown',
          performedByName: item.uploadedBy?.fullName ?? item.uploadedByName ?? 'Unknown',
          timestamp: toIsoString(item.uploadedAt) ?? toIsoString(item.createdAt) ?? new Date().toISOString(),
          details: item.fileHash ? `SHA-256 file hash recorded at upload: ${item.fileHash}` : '',
        },
      ],
    })))
  } catch (error) {
    console.error('Evidence route error:', error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const token = await getBackendAuthToken()

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const reportId = formData.get('reportId')

    if (!(file instanceof Blob) || !file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const body = new FormData()
    const fileName = typeof (file as File).name === 'string' ? (file as File).name : 'evidence'
    body.append('file', file, fileName)
    const description = formData.get('description')
    if (reportId) body.append('reportId', String(reportId))
    if (description) body.append('description', String(description))

    const response = await backendFetch('/api/evidence/upload', {
      method: 'POST',
      body,
    }, token)

    if (response.status === 401) {
      const { clearBackendAuthCookie } = await import('@/lib/backend')
      await clearBackendAuthCookie()
      return NextResponse.json({ error: 'Authentication expired' }, { status: 401 })
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      return NextResponse.json({ error: payload?.error || 'Failed to upload evidence' }, { status: response.status })
    }

    const payload = await response.json()
    return NextResponse.json({
      id: payload.id ?? `evd-${Date.now()}`,
      ...payload,
      uploadedAt: payload.uploadedAt ?? new Date().toISOString(),
      chainOfCustody: payload.chainOfCustody ?? [],
    }, { status: 201 })
  } catch (error) {
    console.error('Upload evidence error:', error)
    return NextResponse.json({ error: 'Failed to upload evidence' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    const token = await getBackendAuthToken()

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const response = await backendFetch(`/api/evidence/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    }, token)

    if (response.status === 401) {
      return NextResponse.json({ error: 'Authentication expired' }, { status: 401 })
    }

    if (!response.ok) {
      throw new Error(`Failed to update evidence: ${response.status}`)
    }

    const payload = await response.json()
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Update evidence error:', error)
    return NextResponse.json({ error: 'Failed to update evidence' }, { status: 500 })
  }
}

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

    const response = await backendFetch(`/api/evidence/${id}`, {
      method: 'DELETE',
    }, token)

    if (response.status === 401) {
      return NextResponse.json({ error: 'Authentication expired' }, { status: 401 })
    }

    if (!response.ok) {
      throw new Error(`Failed to delete evidence: ${response.status}`)
    }

    return NextResponse.json({ success: true, message: 'Evidence deleted successfully' })
  } catch (error) {
    console.error('Delete evidence error:', error)
    return NextResponse.json({ error: 'Failed to delete evidence' }, { status: 500 })
  }
}
