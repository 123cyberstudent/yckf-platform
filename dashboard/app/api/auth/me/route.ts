// Get Current User API Route
import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const response = await backendFetch('/api/auth/me', { method: 'GET' }, token, { autoRefresh: true })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data?.error || 'Not authenticated' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    )
  }
}
