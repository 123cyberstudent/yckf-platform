import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function POST(request: Request) {
  try {
    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    const body = await request.json()
    const response = await backendFetch('/api/audit/export-log', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token)

    if (!response.ok) {
      return NextResponse.json({ success: false }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Export log proxy error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
