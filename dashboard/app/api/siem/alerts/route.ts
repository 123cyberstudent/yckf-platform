import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()

    if (!token) {
      return NextResponse.json({ summary: { failedLogins24h: 0, failedLogins1h: 0, totalUsers: 0, activeCases: 0, recentEvidence: 0, recentAudit: 0 }, alerts: [] })
    }

    const response = await backendFetch('/api/siem/alerts', { method: 'GET' }, token)

    if (!response.ok) {
      return NextResponse.json({ summary: { failedLogins24h: 0, failedLogins1h: 0, totalUsers: 0, activeCases: 0, recentEvidence: 0, recentAudit: 0 }, alerts: [] })
    }

    const payload = await response.json().catch(() => null)
    const alerts = Array.isArray(payload?.alerts) ? payload.alerts : []
    return NextResponse.json({ summary: payload?.summary ?? {}, alerts })
  } catch (error) {
    console.error('SIEM alerts route error:', error)
    return NextResponse.json({ summary: {}, alerts: [] }, { status: 500 })
  }
}
