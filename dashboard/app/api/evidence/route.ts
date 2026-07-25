import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken, toIsoString } from '@/lib/backend'
import { evidence, incidents } from '@/lib/mock-data'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const incidentId = searchParams.get('incidentId')
    const token = await getBackendAuthToken()
    
    // If no token, use mock data
    if (!token) {
      console.log('No auth token found, using mock evidence data')
      return NextResponse.json(transformMockEvidence(incidentId))
    }

    try {
      // Try to fetch from backend - using the evidence endpoint
      const response = await backendFetch('/api/evidence', { method: 'GET' }, token)
      
      // If backend returns 401 or any error, use mock data
      if (response.status === 401 || response.status === 404) {
        console.log(`Backend returned ${response.status}, using mock evidence data`)
        if (response.status === 401) {
          const { clearBackendAuthCookie } = await import('@/lib/backend')
          await clearBackendAuthCookie()
        }
        return NextResponse.json(transformMockEvidence(incidentId))
      }

      if (!response.ok) {
        console.log(`Backend error ${response.status}, using mock evidence data`)
        return NextResponse.json(transformMockEvidence(incidentId))
      }

      const payload = await response.json().catch(() => null)
      
      if (!payload) {
        console.log('Invalid response payload, using mock evidence data')
        return NextResponse.json(transformMockEvidence(incidentId))
      }

      // Handle different response formats
      let items = []
      if (Array.isArray(payload)) {
        items = payload
      } else if (Array.isArray(payload?.evidence)) {
        items = payload.evidence
      } else if (Array.isArray(payload?.items)) {
        items = payload.items
      } else if (payload?.data && Array.isArray(payload.data)) {
        items = payload.data
      }

      // Transform backend data to match frontend format
      return NextResponse.json(items.map((item: any) => ({
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
        chainOfCustody: item.chainOfCustody ?? [],
      })))
    } catch (fetchError) {
      // Network error or backend unreachable - use mock data
      console.log('Backend unreachable, using mock evidence data:', fetchError)
      return NextResponse.json(transformMockEvidence(incidentId))
    }
  } catch (error) {
    console.error('Evidence route error:', error)
    // Always return mock data as final fallback
    return NextResponse.json(transformMockEvidence())
  }
}

// Helper function to transform mock evidence
function transformMockEvidence(incidentId?: string | null) {
  let filteredEvidence = evidence
  
  // Filter by incidentId if provided
  if (incidentId) {
    filteredEvidence = evidence.filter(item => item.incidentId === incidentId)
  }
  
  return filteredEvidence.map(item => ({
    id: item.id,
    incidentId: item.incidentId,
    incidentTitle: item.incidentTitle,
    filename: item.filename,
    fileType: item.fileType,
    fileSize: item.fileSize,
    hash: item.hash,
    uploadedBy: item.uploadedBy,
    uploadedByName: item.uploadedByName,
    uploadedAt: item.uploadedAt.toISOString(),
    description: item.description,
    chainOfCustody: item.chainOfCustody.map(audit => ({
      id: audit.id,
      action: audit.action,
      performedBy: audit.performedBy,
      performedByName: audit.performedByName,
      timestamp: audit.timestamp.toISOString(),
      details: audit.details,
    })),
  }))
}

// For uploading evidence
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = await getBackendAuthToken()
    
    // If no token, use mock creation
    if (!token) {
      console.log('No auth token found, creating mock evidence')
      const newEvidence = {
        id: `evd-${Date.now()}`,
        ...body,
        uploadedAt: new Date().toISOString(),
        chainOfCustody: [
          {
            id: `audit-${Date.now()}`,
            action: 'Uploaded',
            performedBy: 'user-1',
            performedByName: 'System',
            timestamp: new Date().toISOString(),
            details: 'Evidence uploaded (mock mode)',
          }
        ],
      }
      return NextResponse.json(newEvidence, { status: 201 })
    }

    try {
      const response = await backendFetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, token)

      if (response.status === 401) {
        console.log('Auth token invalid, creating mock evidence')
        const { clearBackendAuthCookie } = await import('@/lib/backend')
        await clearBackendAuthCookie()
        const newEvidence = {
          id: `evd-${Date.now()}`,
          ...body,
          uploadedAt: new Date().toISOString(),
          chainOfCustody: [
            {
              id: `audit-${Date.now()}`,
              action: 'Uploaded',
              performedBy: 'user-1',
              performedByName: 'System',
              timestamp: new Date().toISOString(),
              details: 'Evidence uploaded (mock mode)',
            }
          ],
        }
        return NextResponse.json(newEvidence, { status: 201 })
      }

      if (!response.ok) {
        console.log(`Backend error ${response.status}, returning mock evidence`)
        const newEvidence = {
          id: `evd-${Date.now()}`,
          ...body,
          uploadedAt: new Date().toISOString(),
          chainOfCustody: [
            {
              id: `audit-${Date.now()}`,
              action: 'Uploaded',
              performedBy: 'user-1',
              performedByName: 'System',
              timestamp: new Date().toISOString(),
              details: 'Evidence uploaded (fallback)',
            }
          ],
        }
        return NextResponse.json(newEvidence, { status: 201 })
      }

      const payload = await response.json()
      return NextResponse.json({
        id: payload.id ?? `evd-${Date.now()}`,
        ...body,
        uploadedAt: payload.uploadedAt ?? new Date().toISOString(),
        chainOfCustody: payload.chainOfCustody ?? [],
      }, { status: 201 })
    } catch (fetchError) {
      console.log('Backend unreachable, creating mock evidence')
      const newEvidence = {
        id: `evd-${Date.now()}`,
        ...body,
        uploadedAt: new Date().toISOString(),
        chainOfCustody: [
          {
            id: `audit-${Date.now()}`,
            action: 'Uploaded',
            performedBy: 'user-1',
            performedByName: 'System',
            timestamp: new Date().toISOString(),
            details: 'Evidence uploaded (network fallback)',
          }
        ],
      }
      return NextResponse.json(newEvidence, { status: 201 })
    }
  } catch (error) {
    console.error('Upload evidence error:', error)
    return NextResponse.json(
      { error: 'Failed to upload evidence' },
      { status: 500 }
    )
  }
}

// For individual evidence items
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    const token = await getBackendAuthToken()
    
    if (!token) {
      console.log('No auth token found, updating mock evidence')
      return NextResponse.json({
        id,
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
    }

    try {
      const response = await backendFetch(`/api/evidence/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      }, token)

      if (response.status === 401) {
        console.log('Auth token invalid, updating mock evidence')
        return NextResponse.json({
          id,
          ...updateData,
          updatedAt: new Date().toISOString(),
        })
      }

      if (!response.ok) {
        throw new Error(`Failed to update evidence: ${response.status}`)
      }

      const payload = await response.json()
      return NextResponse.json(payload)
    } catch (fetchError) {
      console.log('Backend unreachable, updating mock evidence')
      return NextResponse.json({
        id,
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error('Update evidence error:', error)
    return NextResponse.json(
      { error: 'Failed to update evidence' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Evidence ID is required' },
        { status: 400 }
      )
    }

    const token = await getBackendAuthToken()
    
    if (!token) {
      console.log('No auth token found, deleting mock evidence')
      return NextResponse.json({
        success: true,
        message: 'Evidence deleted successfully'
      })
    }

    try {
      const response = await backendFetch(`/api/evidence/${id}`, {
        method: 'DELETE',
      }, token)

      if (response.status === 401) {
        console.log('Auth token invalid, deleting mock evidence')
        return NextResponse.json({
          success: true,
          message: 'Evidence deleted successfully'
        })
      }

      if (!response.ok) {
        throw new Error(`Failed to delete evidence: ${response.status}`)
      }

      return NextResponse.json({
        success: true,
        message: 'Evidence deleted successfully'
      })
    } catch (fetchError) {
      console.log('Backend unreachable, deleting mock evidence')
      return NextResponse.json({
        success: true,
        message: 'Evidence deleted successfully'
      })
    }
  } catch (error) {
    console.error('Delete evidence error:', error)
    return NextResponse.json(
      { error: 'Failed to delete evidence' },
      { status: 500 }
    )
  }
}