import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 })
    }

    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const response = await backendFetch(
      `/api/emergency-reports/audio/${encodeURIComponent(filename)}`,
      { method: 'GET' },
      token
    )

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      return NextResponse.json({ error: payload?.error || 'Audio load failed' }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg'
    const body = await response.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    console.error('Emergency audio load error:', error)
    return NextResponse.json({ error: 'Audio load failed' }, { status: 500 })
  }
}
