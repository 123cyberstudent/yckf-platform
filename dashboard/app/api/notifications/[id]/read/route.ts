import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'
import { notifications } from '@/lib/mock-data'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await getBackendAuthToken()

    if (!token) {
      const notification = notifications.find(n => n.id === id)
      if (notification) notification.read = true
      return NextResponse.json({ success: true })
    }

    try {
      const response = await backendFetch(`/api/notifications/${id}/read`, {
        method: 'POST',
      }, token)

      if (!response.ok) {
        const notification = notifications.find(n => n.id === id)
        if (notification) notification.read = true
        return NextResponse.json({ success: true })
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch {
      const notification = notifications.find(n => n.id === id)
      if (notification) notification.read = true
      return NextResponse.json({ success: true })
    }
  } catch {
    return NextResponse.json({ success: true })
  }
}
