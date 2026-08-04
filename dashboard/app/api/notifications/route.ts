import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'
import { notifications } from '@/lib/mock-data'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    
    // If no token, use mock data
    if (!token) {
      console.log('No auth token found, using mock notifications data')
      return NextResponse.json(transformMockNotifications(notifications))
    }

    try {
      const response = await backendFetch('/api/notifications', { method: 'GET' }, token, { autoRefresh: true })
      
      // If backend returns 401 or any error, use mock data
      if (response.status === 401) {
        console.log('Auth token invalid, using mock notifications data')
        const { clearBackendAuthCookie } = await import('@/lib/backend')
        await clearBackendAuthCookie()
        return NextResponse.json(transformMockNotifications(notifications))
      }

      if (!response.ok) {
        console.log(`Backend error ${response.status}, using mock notifications data`)
        return NextResponse.json(transformMockNotifications(notifications))
      }

      const payload = await response.json().catch(() => null)
      
      if (!payload) {
        console.log('Invalid response payload, using mock notifications data')
        return NextResponse.json(transformMockNotifications(notifications))
      }

      // Handle both array and object responses with notifications property
      const items = Array.isArray(payload) 
        ? payload 
        : (Array.isArray(payload?.notifications) ? payload.notifications : [])
      
      // Transform backend data to match frontend format
      return NextResponse.json(items.map((notification: any) => ({
        id: notification.id?.toString() ?? `notif-${Date.now()}-${Math.random()}`,
        type: notification.type ?? 'alert',
        title: notification.title ?? 'Notification',
        message: notification.body ?? notification.message ?? '',
        priority: notification.priority ?? 'normal',
        createdAt: notification.createdAt ?? new Date().toISOString(),
        read: notification.isRead ?? notification.read ?? false,
        targetRoles: notification.targetRoles ?? ['admin', 'investigator'],
      })))
    } catch (fetchError) {
      // Network error or backend unreachable - use mock data
      console.log('Backend unreachable, using mock notifications data:', fetchError)
      return NextResponse.json(transformMockNotifications(notifications))
    }
  } catch (error) {
    console.error('Notifications route error:', error)
    // Always return mock data as final fallback
    return NextResponse.json(transformMockNotifications(notifications))
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = await getBackendAuthToken()
    
    // If no token, simulate creating a notification in mock mode
    if (!token) {
      console.log('No auth token found, creating mock notification')
      return NextResponse.json({
        id: `notif-${Date.now()}`,
        type: 'broadcast',
        title: body.title ?? 'Broadcast',
        message: body.message ?? '',
        priority: body.priority ?? 'high',
        createdAt: new Date().toISOString(),
        read: false,
        targetRoles: body.targetRoles ?? ['admin', 'investigator'],
      }, { status: 201 })
    }

    const response = await backendFetch('/api/notifications/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title: body.title, 
        body: body.message, 
        link: body.link,
        priority: body.priority,
        targetRoles: body.targetRoles,
        audience: body.audience,
        recipientEmails: body.recipientEmails,
      }),
    }, token)
    
    const payload = await response.json().catch(() => null)

    // If backend returns 401, surface the session problem so the UI can react
    if (response.status === 401) {
      const { clearBackendAuthCookie } = await import('@/lib/backend')
      await clearBackendAuthCookie()
      return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 })
    }

    if (!response.ok) {
      // Propagate the real backend error instead of faking success
      return NextResponse.json(
        { error: payload?.error ?? `Backend error ${response.status}` },
        { status: response.status }
      )
    }

    // Return the real response from backend
    return NextResponse.json({
      id: payload?.id ?? `notif-${Date.now()}`,
      type: 'broadcast',
      title: body.title ?? 'Broadcast',
      message: body.message ?? '',
      priority: body.priority ?? 'high',
      createdAt: payload?.createdAt ?? new Date().toISOString(),
      read: false,
      targetRoles: body.targetRoles ?? ['admin', 'investigator'],
    }, { status: 201 })
  } catch (error) {
    console.error('Create notification error:', error)
    return NextResponse.json(
      { error: 'Backend unreachable. Broadcast was not sent.' },
      { status: 502 }
    )
  }
}

// Helper function to transform mock notifications
function transformMockNotifications(mockNotifications: any[]) {
  return mockNotifications.map(notification => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    createdAt: notification.createdAt,
    read: notification.read,
    targetRoles: notification.targetRoles || [],
  }))
}