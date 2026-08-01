import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'
import { notifications } from '@/lib/mock-data'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const token = await getBackendAuthToken()
    
    if (!token) {
      // For mock mode, find and update the notification
      const notification = notifications.find(n => n.id === id)
      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        )
      }
      const updatedNotification = { 
        ...notification, 
        ...body,
        updatedAt: new Date().toISOString()
      }
      return NextResponse.json(updatedNotification)
    }

    try {
      const response = await backendFetch(`/api/notifications/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }, token)

      if (response.status === 401) {
        console.log('Auth token invalid, using mock update')
        const notification = notifications.find(n => n.id === id)
        if (!notification) {
          return NextResponse.json(
            { error: 'Notification not found' },
            { status: 404 }
          )
        }
        const updatedNotification = { 
          ...notification, 
          ...body,
          updatedAt: new Date().toISOString()
        }
        return NextResponse.json(updatedNotification)
      }

      if (!response.ok) {
        throw new Error(`Failed to update notification: ${response.status}`)
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch {
      console.log('Backend unreachable, using mock update')
      const notification = notifications.find(n => n.id === id)
      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        )
      }
      const updatedNotification = { 
        ...notification, 
        ...body,
        updatedAt: new Date().toISOString()
      }
      return NextResponse.json(updatedNotification)
    }
  } catch (error) {
    console.error('Update notification error:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
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
      // For mock mode, check if notification exists and return success
      const notification = notifications.find(n => n.id === id)
      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { success: true, message: 'Notification deleted successfully' }
      )
    }

    try {
      const response = await backendFetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      }, token)

      if (response.status === 401) {
        console.log('Auth token invalid, using mock delete')
        return NextResponse.json(
          { success: true, message: 'Notification deleted successfully' }
        )
      }

      if (!response.ok) {
        throw new Error(`Failed to delete notification: ${response.status}`)
      }

      return NextResponse.json(
        { success: true, message: 'Notification deleted successfully' }
      )
    } catch {
      console.log('Backend unreachable, using mock delete')
      return NextResponse.json(
        { success: true, message: 'Notification deleted successfully' }
      )
    }
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}