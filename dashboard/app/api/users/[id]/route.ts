import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'
import { users } from '@/lib/mock-data'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await getBackendAuthToken()
    
    if (!token) {
      console.log('No auth token found, using mock user data')
      const user = users.find(u => u.id === id)
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(user)
    }

    try {
      const response = await backendFetch(`/api/users/${id}`, { method: 'GET' }, token)
      
      if (response.status === 401) {
        console.log('Auth token invalid, using mock user data')
        const { clearBackendAuthCookie } = await import('@/lib/backend')
        await clearBackendAuthCookie()
        const user = users.find(u => u.id === id)
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }
        return NextResponse.json(user)
      }

      if (!response.ok) {
        throw new Error(`Failed to load user: ${response.status}`)
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch {
      console.log('Backend unreachable, using mock user data')
      const user = users.find(u => u.id === id)
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(user)
    }
  } catch (error) {
    console.error('User route error:', error)
    return NextResponse.json(
      { error: 'Failed to load user' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const token = await getBackendAuthToken()
    
    if (!token) {
      // For mock mode, return the updated user
      const user = users.find(u => u.id === id)
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      const updatedUser = { ...user, ...body, updatedAt: new Date() }
      return NextResponse.json(updatedUser)
    }

    try {
      const response = await backendFetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, token)

      if (response.status === 401) {
        const { clearBackendAuthCookie } = await import('@/lib/backend')
        await clearBackendAuthCookie()
      }

      if (!response.ok) {
        const user = users.find(u => u.id === id)
        if (user) {
          const updatedUser = { ...user, ...body, updatedAt: new Date() }
          return NextResponse.json(updatedUser)
        }
        throw new Error(`Failed to update user: ${response.status}`)
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError) {
      const user = users.find(u => u.id === id)
      if (user) {
        const updatedUser = { ...user, ...body, updatedAt: new Date() }
        return NextResponse.json(updatedUser)
      }
      throw fetchError
    }
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await getBackendAuthToken()
    
    if (!token) {
      // For mock mode, just return success
      return NextResponse.json(
        { success: true, message: 'User deleted successfully' }
      )
    }

    const response = await backendFetch(`/api/users/${id}`, {
      method: 'DELETE',
    }, token)

    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.status}`)
    }

    return NextResponse.json(
      { success: true, message: 'User deleted successfully' }
    )
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}