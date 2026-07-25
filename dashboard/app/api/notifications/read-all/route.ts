import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function PATCH() {
  try {
    const token = await getBackendAuthToken()
    
    if (!token) {
      // For mock mode, return success
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      })
    }

    try {
      const response = await backendFetch('/api/notifications/read-all', {
        method: 'PATCH',
      }, token)

      if (response.status === 401) {
        console.log('Auth token invalid, using mock read-all')
        return NextResponse.json({
          success: true,
          message: 'All notifications marked as read'
        })
      }

      if (!response.ok) {
        throw new Error(`Failed to mark all as read: ${response.status}`)
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError) {
      console.log('Backend unreachable, using mock read-all')
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      })
    }
  } catch (error) {
    console.error('Mark all as read error:', error)
    return NextResponse.json(
      { error: 'Failed to mark all as read' },
      { status: 500 }
    )
  }
}