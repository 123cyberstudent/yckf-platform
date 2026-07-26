import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'
import { users } from '@/lib/mock-data'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    
    // If no token, use mock data
    if (!token) {
      console.log('No auth token found, using mock users data')
      return NextResponse.json(transformMockUsers(users))
    }

    try {
      const response = await backendFetch('/api/users', { method: 'GET' }, token)
      
      // If backend returns 401 or any error, use mock data
      if (response.status === 401) {
        console.log('Auth token invalid, using mock users data')
        const { clearBackendAuthCookie } = await import('@/lib/backend')
        await clearBackendAuthCookie()
        return NextResponse.json(transformMockUsers(users))
      }

      if (!response.ok) {
        console.log(`Backend error ${response.status}, using mock users data`)
        return NextResponse.json(transformMockUsers(users))
      }

      const payload = await response.json().catch(() => null)
      
      if (!payload) {
        console.log('Invalid response payload, using mock users data')
        return NextResponse.json(transformMockUsers(users))
      }

      // If the backend returns users in a different format, transform them
      const userList = Array.isArray(payload) ? payload : payload.users || []
      
      // Transform backend user data to match your frontend User type
      const transformedUsers = userList.map((user: any) => ({
        id: user.id || user._id,
        email: user.email,
        name: user.name || user.fullName || user.username,
        role: user.role || 'volunteer',
        status: user.isActive === false ? 'suspended' : (user.status || 'active'),
        platform: (user.platform || 'web').toLowerCase(),
        avatar: user.avatar || user.profilePicture,
        createdAt: user.createdAt || user.created_at || new Date().toISOString(),
        lastLogin: user.lastLogin || user.last_login || user.lastActive,
      }))

      return NextResponse.json(transformedUsers)
    } catch (fetchError) {
      // Network error or backend unreachable - use mock data
      console.log('Backend unreachable, using mock users data:', fetchError)
      return NextResponse.json(transformMockUsers(users))
    }
  } catch (error) {
    console.error('Users route error:', error)
    // Always return mock data as final fallback
    return NextResponse.json(transformMockUsers(users))
  }
}

// Helper function to transform mock users
function transformMockUsers(mockUsers: any[]) {
  return mockUsers.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    platform: user.platform || 'web',
    avatar: user.avatar,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  }))
}

// If you need POST (create user) functionality
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = await getBackendAuthToken()
    
    if (!token) {
      // For mock mode, create a new user in memory
      const newUser = {
        id: `user-${Date.now()}`,
        ...body,
        createdAt: new Date(),
        lastLogin: new Date(),
        avatar: undefined,
      }
      // In a real app with mock data, you'd add to the mock array
      return NextResponse.json(newUser, { status: 201 })
    }

    const response = await backendFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token)

    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}