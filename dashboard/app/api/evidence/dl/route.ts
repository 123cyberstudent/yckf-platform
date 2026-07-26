import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Evidence ID is required' }, { status: 400 })
    }

    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const response = await backendFetch(`/api/evidence/${id}/download`, { method: 'GET' }, token)

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      return NextResponse.json({ error: payload?.error || 'Download failed' }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const contentDisposition = response.headers.get('content-disposition') || `attachment; filename="evidence-${id}"`
    const body = await response.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    })
  } catch (error) {
    console.error('Evidence download error:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
