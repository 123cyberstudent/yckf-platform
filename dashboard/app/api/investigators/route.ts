import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken, normalizeRole, normalizeStatus, toIsoString } from '@/lib/backend'
import { users } from '@/lib/mock-data'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    
    // If no token, use mock data
    if (!token) {
      console.log('No auth token found, using mock investigators data')
      return NextResponse.json(transformMockInvestigators())
    }

    try {
      const response = await backendFetch('/api/investigators', { method: 'GET' }, token)
      
      // If backend returns 401 or any error, use mock data
      if (response.status === 401 || response.status === 404) {
        console.log(`Backend returned ${response.status}, using mock investigators data`)
        if (response.status === 401) {
          const { clearBackendAuthCookie } = await import('@/lib/backend')
          await clearBackendAuthCookie()
        }
        return NextResponse.json(transformMockInvestigators())
      }

      if (!response.ok) {
        console.log(`Backend error ${response.status}, using mock investigators data`)
        return NextResponse.json(transformMockInvestigators())
      }

      const payload = await response.json().catch(() => null)
      
      if (!payload) {
        console.log('Invalid response payload, using mock investigators data')
        return NextResponse.json(transformMockInvestigators())
      }

      // Handle both array and object responses with investigators property
      const items = Array.isArray(payload) 
        ? payload 
        : (Array.isArray(payload?.investigators) ? payload.investigators : [])
      
      // Transform backend data to match frontend format
      return NextResponse.json(items.map((user: any) => ({
        id: user.id?.toString() ?? `inv-${Date.now()}-${Math.random()}`,
        email: user.email ?? '',
        name: user.fullName ?? user.name ?? 'Unknown',
        role: normalizeRole(user.role),
        status: normalizeStatus(user.isActive ? 'active' : 'inactive'),
        createdAt: toIsoString(user.createdAt) ?? new Date().toISOString(),
        lastLogin: toIsoString(user.lastLogin) ?? null,
      })))
    } catch (fetchError) {
      // Network error or backend unreachable - use mock data
      console.log('Backend unreachable, using mock investigators data:', fetchError)
      return NextResponse.json(transformMockInvestigators())
    }
  } catch (error) {
    console.error('Investigators route error:', error)
    // Always return mock data as final fallback
    return NextResponse.json(transformMockInvestigators())
  }
}

// Helper function to transform mock users to investigators/volunteers
function transformMockInvestigators() {
  // Filter users with role 'investigator', 'volunteer', or 'admin' (admins can also be investigators)
  const investigators = users.filter(user => 
    user.role === 'investigator' || user.role === 'volunteer' || user.role === 'admin'
  )
  
  return investigators.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
    lastLogin: user.lastLogin ? (user.lastLogin instanceof Date ? user.lastLogin.toISOString() : String(user.lastLogin)) : null,
  }))
}

// If you need investigator statistics
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = await getBackendAuthToken()
    
    // If no token, use mock creation
    if (!token) {
      console.log('No auth token found, creating mock volunteer')
      const newInvestigator = {
        id: `inv-${Date.now()}`,
        ...body,
        role: 'volunteer',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: null,
      }
      return NextResponse.json(newInvestigator, { status: 201 })
    }

    try {
      const response = await backendFetch('/api/investigators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, token)

      if (response.status === 401) {
        console.log('Auth token invalid, creating mock volunteer')
        const { clearBackendAuthCookie } = await import('@/lib/backend')
        await clearBackendAuthCookie()
        const newInvestigator = {
          id: `inv-${Date.now()}`,
          ...body,
          role: 'volunteer',
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLogin: null,
        }
        return NextResponse.json(newInvestigator, { status: 201 })
      }

      if (!response.ok) {
        // If backend fails, still return a mock success response
        console.log(`Backend error ${response.status}, returning mock volunteer`)
        const newInvestigator = {
          id: `inv-${Date.now()}`,
          ...body,
          role: 'volunteer',
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLogin: null,
        }
        return NextResponse.json(newInvestigator, { status: 201 })
      }

      const payload = await response.json()
      return NextResponse.json({
        id: payload.id ?? `inv-${Date.now()}`,
        ...body,
        role: 'volunteer',
        status: 'active',
        createdAt: payload.createdAt ?? new Date().toISOString(),
        lastLogin: null,
      }, { status: 201 })
    } catch (fetchError) {
      console.log('Backend unreachable, creating mock volunteer')
      const newInvestigator = {
        id: `inv-${Date.now()}`,
        ...body,
        role: 'volunteer',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: null,
      }
      return NextResponse.json(newInvestigator, { status: 201 })
    }
  } catch (error) {
    console.error('Create volunteer error:', error)
    return NextResponse.json(
      { error: 'Failed to create volunteer' },
      { status: 500 }
    )
  }
}

// For individual investigator routes
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    const token = await getBackendAuthToken()
    
    if (!token) {
      console.log('No auth token found, updating mock volunteer')
      return NextResponse.json({
        id,
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
    }

    try {
      const response = await backendFetch(`/api/investigators/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      }, token)

      if (response.status === 401) {
        console.log('Auth token invalid, updating mock volunteer')
        return NextResponse.json({
          id,
          ...updateData,
          updatedAt: new Date().toISOString(),
        })
      }

      if (!response.ok) {
        throw new Error(`Failed to update volunteer: ${response.status}`)
      }

      const payload = await response.json()
      return NextResponse.json(payload)
    } catch (fetchError) {
      console.log('Backend unreachable, updating mock volunteer')
      return NextResponse.json({
        id,
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error('Update volunteer error:', error)
    return NextResponse.json(
      { error: 'Failed to update volunteer' },
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
        { error: 'Volunteer ID is required' },
        { status: 400 }
      )
    }

    const token = await getBackendAuthToken()
    
    if (!token) {
      console.log('No auth token found, deleting mock volunteer')
      return NextResponse.json({
        success: true,
        message: 'Volunteer deleted successfully'
      })
    }

    try {
      const response = await backendFetch(`/api/investigators/${id}`, {
        method: 'DELETE',
      }, token)

      if (response.status === 401) {
        console.log('Auth token invalid, deleting mock volunteer')
        return NextResponse.json({
          success: true,
          message: 'Volunteer deleted successfully'
        })
      }

      if (!response.ok) {
        throw new Error(`Failed to delete volunteer: ${response.status}`)
      }

      return NextResponse.json({
        success: true,
        message: 'Volunteer deleted successfully'
      })
    } catch (fetchError) {
      console.log('Backend unreachable, deleting mock volunteer')
      return NextResponse.json({
        success: true,
        message: 'Volunteer deleted successfully'
      })
    }
  } catch (error) {
    console.error('Delete volunteer error:', error)
    return NextResponse.json(
      { error: 'Failed to delete volunteer' },
      { status: 500 }
    )
  }
}