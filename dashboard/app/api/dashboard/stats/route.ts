// app/api/dashboard/stats/route.ts
import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken, formatResponseTimeSeconds } from '@/lib/backend'
import { getDashboardStats } from '@/lib/mock-data'

export async function GET() {
  try {
    const token = await getBackendAuthToken()
    
    // If no token, use mock data
    if (!token) {
      console.log('No auth token found, using mock dashboard stats')
      const mockStats = getDashboardStats()
      return NextResponse.json(transformMockStats(mockStats))
    }

    try {
      const response = await backendFetch('/api/analytics/stats', { method: 'GET' }, token)
      
      // If backend returns 401 or any error, use mock data
      if (response.status === 401) {
        console.log('Auth token invalid, using mock dashboard stats')
        const { clearBackendAuthCookie } = await import('@/lib/backend')
        await clearBackendAuthCookie()
        const mockStats = getDashboardStats()
        return NextResponse.json(transformMockStats(mockStats))
      }

      if (!response.ok) {
        console.log(`Backend error ${response.status}, using mock dashboard stats`)
        const mockStats = getDashboardStats()
        return NextResponse.json(transformMockStats(mockStats))
      }

      const payload = await response.json().catch(() => null)
      
      // If no payload, use mock data
      if (!payload) {
        console.log('Invalid response payload, using mock dashboard stats')
        const mockStats = getDashboardStats()
        return NextResponse.json(transformMockStats(mockStats))
      }

      // Transform backend data to match expected format
      const data = {
        totalUsers: payload?.total_users ?? payload?.totalUsers ?? 0,
        mobileUsers: payload?.mobile_users ?? payload?.mobileUsers ?? 0,
        webUsers: payload?.web_users ?? payload?.webUsers ?? 0,
        activeCases: payload?.active_cases ?? payload?.activeCases ?? 0,
        pendingCases: payload?.pending_cases ?? payload?.pendingCases ?? 0,
        resolvedCases: payload?.resolved_cases ?? payload?.resolvedCases ?? 0,
        criticalIncidents: payload?.critical_incidents ?? payload?.criticalIncidents ?? 0,
        activeInvestigators: payload?.active_investigators ?? payload?.activeInvestigators ?? 0,
        avgResponseTime: payload?.avg_response_time_seconds != null
          ? formatResponseTimeSeconds(payload.avg_response_time_seconds)
          : payload?.avgResponseTime ?? '0.0 hrs',
        casesThisMonth: payload?.cases_this_month ?? payload?.casesThisMonth ?? 0,
      }

      return NextResponse.json(data)
    } catch (fetchError) {
      // Network error or backend unreachable - use mock data
      console.log('Backend unreachable, using mock dashboard stats:', fetchError)
      const mockStats = getDashboardStats()
      return NextResponse.json(transformMockStats(mockStats))
    }
  } catch (error) {
    console.error('Dashboard stats route error:', error)
    // return mock data as final fallback
    const mockStats = getDashboardStats()
    return NextResponse.json(transformMockStats(mockStats))
  }
}

// Helper function to transform mock data to match the expected API response format
function transformMockStats(mockStats: any) {
  // Calculate cases this month (simplified - you might want to calculate from actual incidents)
  const casesThisMonth = Math.floor(Math.random() * 50) + 20
  
  return {
    totalUsers: mockStats.totalUsers || 0,
    mobileUsers: 0,
    webUsers: mockStats.totalUsers || 0,
    activeCases: mockStats.openIncidents + mockStats.investigatingIncidents || 0,
    pendingCases: mockStats.pendingIncidents || 0,
    resolvedCases: mockStats.resolvedIncidents || 0,
    criticalIncidents: mockStats.criticalIncidents || 0,
    activeInvestigators: mockStats.activeUsers || 0,
    avgResponseTime: `${mockStats.avgResponseTimeHours?.toFixed(1) || '0.0'} hrs`,
    casesThisMonth: casesThisMonth,
  }
}