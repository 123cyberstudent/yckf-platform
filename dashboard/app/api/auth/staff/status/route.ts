import { NextResponse } from 'next/server'
import { backendFetch } from '@/lib/backend'

export async function GET() {
  try {
    const response = await backendFetch('/api/auth/staff/status')
    const payload = await response.json().catch(() => null)
    return NextResponse.json({
      success: true,
      enabled: !!payload?.enabled,
    })
  } catch (error) {
    console.error('Staff status error:', error)
    return NextResponse.json({ success: false, enabled: false })
  }
}
