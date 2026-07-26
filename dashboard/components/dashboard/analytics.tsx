'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, TrendingDown, Users, Clock, AlertTriangle, CheckCircle, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generatePlatformReport } from '@/lib/pdf-utils';
import { logExport } from '@/lib/export-logger';

interface AnalyticsData {
  summary: Array<{
    label: string;
    value: string;
    trend: string;
  }>;
  monthlyData: Array<{
    month: string;
    incidents: number;
    resolved: number;
    critical: number;
  }>;
  categoryData: Array<{
    name: string;
    value: number;
  }>;
  priorityData: Array<{
    name: string;
    value: number;
  }>;
  workloadData: Array<{
    name: string;
    cases: number;
    rate: string;
  }>;
  severityDistribution?: Array<{
    severity: string;
    count: number;
  }>;
  investigatorPerformance?: Array<{
    name: string;
    resolved: number;
    investigating: number;
  }>;
  volunteerPerformance?: Array<{
    name: string;
    resolved: number;
    investigating: number;
  }>;
  recentActivity?: Array<{
    id: string;
    action: string;
    description: string;
    user: string;
    timestamp: string;
    type: string;
  }>;
  caseClosureRate?: number;
  averageResolutionTime?: string;
  openCases?: number;
  pendingCases?: number;
  resolvedCases?: number;
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        setUsingMockData(false);
        
        const response = await fetch('/api/analytics');
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            console.warn('Authentication required, using mock data');
            setUsingMockData(true);
          }
          throw new Error(`Failed to load analytics: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        setError('Failed to load analytics. Please try again later.');
        
        // Try to load from mock endpoint as fallback
        try {
          console.log('Attempting to fetch from mock endpoint...');
          const mockResponse = await fetch('/api/analytics/mock');
          if (mockResponse.ok) {
            const mockData = await mockResponse.json();
            setData(mockData);
            setUsingMockData(true);
          }
        } catch (mockError) {
          console.error('Failed to load mock analytics:', mockError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const getTrendIcon = (trend: string) => {
    if (trend.startsWith('+')) {
      return <TrendingUp className="size-4 text-green-500" />;
    } else if (trend.startsWith('-')) {
      return <TrendingDown className="size-4 text-red-500" />;
    }
    return null;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500/10 text-red-500',
      high: 'bg-orange-500/10 text-orange-500',
      medium: 'bg-yellow-500/10 text-yellow-500',
      low: 'bg-blue-500/10 text-blue-500',
    };
    return colors[severity] || 'bg-gray-500/10 text-gray-500';
  };

  const handleExportPdf = async () => {
    let pdfData = data;
    if (!pdfData) {
      try {
        const response = await fetch('/api/analytics');
        if (response.ok) {
          pdfData = await response.json();
        }
      } catch {
        console.error('Failed to fetch analytics for PDF export');
        return;
      }
    }
    if (!pdfData) return;

    const totalCasesFromSummary = pdfData.summary?.find(
      (s) => s.label.toLowerCase().includes('total')
    );

    generatePlatformReport({
      totalCases: totalCasesFromSummary ? parseInt(totalCasesFromSummary.value, 10) || 0 : undefined,
      openCases: pdfData.openCases,
      pendingCases: pdfData.pendingCases,
      resolvedCases: pdfData.resolvedCases,
      caseClosureRate: pdfData.caseClosureRate,
      averageResolutionTime: pdfData.averageResolutionTime,
      monthlyData: pdfData.monthlyData,
      categoryData: pdfData.categoryData,
      recentActivity: pdfData.recentActivity,
    });
    logExport('analytics', 'pdf', 1);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          Loading analytics data...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto size-12 text-red-500 mb-4" />
          <p className="text-red-600">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="flex items-center gap-2">
          {usingMockData && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
              Demo Data
            </Badge>
          )}
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="mr-2 size-4" />
            Download PDF Report
          </Button>
        </div>
      </div>

      {usingMockData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="size-4 text-yellow-600 mt-0.5" />
          <p className="text-sm text-yellow-700">
            Using demo analytics data - Backend connection unavailable
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data.summary.map((item, index) => (
          <Card key={index} className="glass-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold mt-2">{item.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(item.trend)}
                <span className={`text-sm ${item.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                  {item.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Trends */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.monthlyData.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-16 text-sm font-medium">{item.month}</div>
                <div className="flex-1">
                  <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${(item.incidents / Math.max(...data.monthlyData.map(d => d.incidents))) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(item.resolved / Math.max(...data.monthlyData.map(d => d.incidents))) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${(item.critical / Math.max(...data.monthlyData.map(d => d.incidents))) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-blue-500" />
                    {item.incidents}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-green-500" />
                    {item.resolved}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-red-500" />
                    {item.critical}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      {data.caseClosureRate !== undefined && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="size-8 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{data.caseClosureRate}%</p>
              <p className="text-sm text-muted-foreground">Case Closure Rate</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="size-8 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{data.averageResolutionTime}</p>
              <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="size-8 text-purple-500" />
              </div>
              <p className="text-2xl font-bold">
                {data.openCases || 0}
              </p>
              <p className="text-sm text-muted-foreground">Open Cases</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Severity Distribution */}
      {data.severityDistribution && data.severityDistribution.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {data.severityDistribution.map((item) => (
                <div key={item.severity} className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className={`text-lg font-bold ${getSeverityColor(item.severity)}`}>
                    {item.count}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {item.severity}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Volunteer Performance */}
      {(data.volunteerPerformance ?? data.investigatorPerformance) && (data.volunteerPerformance ?? data.investigatorPerformance)!.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Volunteer Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.volunteerPerformance ?? data.investigatorPerformance)!.map((inv, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-24 font-medium">{inv.name}</div>
                  <div className="flex-1">
                    <div className="flex h-4 w-full rounded-full overflow-hidden bg-muted">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${(inv.resolved / (inv.resolved + inv.investigating + 1)) * 100}%` }}
                      />
                      <div 
                        className="h-full bg-yellow-500 transition-all"
                        style={{ width: `${(inv.investigating / (inv.resolved + inv.investigating + 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-green-500" />
                      {inv.resolved}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-yellow-500" />
                      {inv.investigating}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {data.recentActivity && data.recentActivity.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'incident' ? 'bg-red-500/10' :
                    activity.type === 'evidence' ? 'bg-blue-500/10' :
                    'bg-purple-500/10'
                  }`}>
                    {activity.type === 'incident' && <AlertTriangle className="size-4 text-red-500" />}
                    {activity.type === 'evidence' && <CheckCircle className="size-4 text-blue-500" />}
                    {activity.type === 'notification' && <Users className="size-4 text-purple-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>By: {activity.user}</span>
                      <span>{new Date(activity.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}