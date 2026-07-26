import { NextResponse } from 'next/server'
import { getDashboardStats, getIncidentTrends, getSeverityDistribution, getVolunteerPerformance, getRecentActivity } from '@/lib/mock-data'

export async function GET() {
  return NextResponse.json({
    stats: getDashboardStats(),
    incidentTrends: getIncidentTrends(),
    severityDistribution: getSeverityDistribution(),
    volunteerPerformance: getVolunteerPerformance(),
    recentActivity: getRecentActivity(),
  })
}
