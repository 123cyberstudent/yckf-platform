import { NextRequest, NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function POST(request: NextRequest) {
  try {
    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const response = await backendFetch('/api/subscriptions/validate-referral', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token, { autoRefresh: true })

    const data = await response.json().catch(() => null)
    return NextResponse.json(data || { error: 'Failed to validate referral code' }, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}
