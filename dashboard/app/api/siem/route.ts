import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    if (!token) {
      return NextResponse.json({
        connected: false,
        status: 'not_configured',
        uptime: 0,
        dataSources: { auditLogs: 0, loginLogs: 0, emailLogs: 0 },
        lastSync: null,
      })
    }

    const response = await backendFetch('/api/siem/status', { method: 'GET' }, token)

    if (!response.ok) {
      return NextResponse.json({
        connected: true,
        status: 'operational',
        uptime: 0,
        dataSources: { auditLogs: 0, loginLogs: 0, emailLogs: 0 },
        lastSync: new Date().toISOString(),
      })
    }

    const payload = await response.json().catch(() => null)
    return NextResponse.json(payload ?? { connected: false, status: 'error' })
  } catch (error) {
    console.error('SIEM status route error:', error)
    return NextResponse.json({ connected: false, status: 'error' }, { status: 500 })
  }
}
