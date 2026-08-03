import { NextRequest, NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken, mockResponse } from '@/lib/backend'

export async function GET(request: NextRequest) {
  try {
    const token = await getBackendAuthToken()
    const { searchParams } = new URL(request.url)
    const placement = searchParams.get('placement') || ''
    const platform = searchParams.get('platform') || undefined
    const params = new URLSearchParams({ placement })
    if (platform) params.set('platform', platform)
    const res = await backendFetch(`/api/promotions/eligible?${params.toString()}`, {}, token ?? undefined)
    if (!res.ok) return mockResponse({ success: false, show: false }, 'Backend unavailable')
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return mockResponse({ success: false, show: false }, 'Backend unreachable')
  }
}
