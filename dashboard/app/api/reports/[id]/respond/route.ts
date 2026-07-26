import { NextRequest, NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { responseText } = body

    if (!responseText || !responseText.trim()) {
      return NextResponse.json({ error: 'Response text is required' }, { status: 400 })
    }

    const response = await backendFetch(
      `/api/reports/${id}/respond`,
      {
        method: 'POST',
        body: JSON.stringify({ responseText: responseText.trim() }),
      },
      token
    )

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      return NextResponse.json(payload || { error: 'Failed to send response' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Failed to send response' }, { status: 500 })
  }
}
