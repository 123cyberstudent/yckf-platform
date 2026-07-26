import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = searchParams.get('hours') || '24'
    const limit = searchParams.get('limit') || '50'
    const type = searchParams.get('type') || 'all'
    const token = await getBackendAuthToken()

    if (!token) {
      return NextResponse.json({ events: [], total: 0 })
    }

    const queryParts = [`hours=${hours}`, `limit=${limit}`]
    if (type && type !== 'all') queryParts.push(`type=${type}`)
    const backendPath = `/api/siem/events?${queryParts.join('&')}`

    const response = await backendFetch(backendPath, { method: 'GET' }, token)

    if (!response.ok) {
      return NextResponse.json({ events: [], total: 0 })
    }

    const payload = await response.json().catch(() => null)
    const events = Array.isArray(payload?.events) ? payload.events : []
    return NextResponse.json({ events, total: payload?.total ?? events.length })
  } catch (error) {
    console.error('SIEM events route error:', error)
    return NextResponse.json({ events: [], total: 0 }, { status: 500 })
  }
}
