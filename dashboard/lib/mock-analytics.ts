import {
  getDashboardStats,
  getIncidentTrends,
  getSeverityDistribution,
  getVolunteerPerformance,
  getRecentActivity,
} from '@/lib/mock-data';

export function generateMockAnalytics() {
  const stats = getDashboardStats()
  const trends = getIncidentTrends()
  const severityDist = getSeverityDistribution()
  const performance = getVolunteerPerformance()
  const activity = getRecentActivity()

  const totalIncidents = stats.totalIncidents
  const avgResponseTime = stats.avgResponseTimeHours
  const criticalCount = stats.criticalIncidents

  const monthlyData = trends.map(item => ({
    month: item.date.split('-').slice(1).join('/'),
    incidents: item.incidents,
    resolved: item.resolved,
    critical: Math.max(0, Math.round(item.incidents * 0.15)),
  }))

  const categoryData = severityDist.map(item => ({
    name: item.severity.charAt(0).toUpperCase() + item.severity.slice(1),
    value: item.count,
  }))

  const priorityData = [
    { name: 'Critical', value: criticalCount },
    { name: 'High', value: Math.max(0, Math.round(totalIncidents * 0.25)) },
    { name: 'Medium', value: Math.max(0, Math.round(totalIncidents * 0.35)) },
    { name: 'Low', value: Math.max(0, Math.round(totalIncidents * 0.2)) },
  ]

  const workloadData = performance.map(inv => ({
    name: inv.name,
    cases: inv.resolved + inv.investigating,
    rate: `${Math.min(100, 80 + Math.round((inv.resolved / (inv.resolved + inv.investigating + 1)) * 20))}%`,
  }))

  const summary = [
    {
      label: 'Total Incidents',
      value: totalIncidents.toString(),
      trend: '+12%',
    },
    {
      label: 'Avg Response',
      value: `${avgResponseTime.toFixed(1)}h`,
      trend: '-8%',
    },
    {
      label: 'Active Users',
      value: stats.activeUsers.toString(),
      trend: '+5%',
    },
    {
      label: 'Critical Alerts',
      value: criticalCount.toString(),
      trend: '+3%',
    },
  ]

  return {
    summary,
    monthlyData,
    categoryData,
    priorityData,
    workloadData,
    severityDistribution: severityDist,
    investigatorPerformance: performance,
    volunteerPerformance: performance,
    recentActivity: activity.slice(0, 5).map(act => ({
      ...act,
      timestamp: act.timestamp.toISOString ? act.timestamp.toISOString() : act.timestamp,
    })),
    caseClosureRate: Math.round((stats.resolvedIncidents / stats.totalIncidents) * 100),
    averageResolutionTime: `${(avgResponseTime * 1.5).toFixed(1)}h`,
    openCases: stats.openIncidents + stats.investigatingIncidents,
    pendingCases: stats.pendingIncidents,
    resolvedCases: stats.resolvedIncidents,
  }
}
