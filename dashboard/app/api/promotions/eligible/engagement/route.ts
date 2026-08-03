import { NextRequest, NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function POST(request: NextRequest) {
  try {
    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({ success: true, tracked: false })
    }
    const body = await request.json()
    const response = await backendFetch('/api/promotions/eligible/engagement', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token, { autoRefresh: true })

    const data = await response.json().catch(() => ({ success: true, tracked: false }))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ success: true, tracked: false })
  }
}
