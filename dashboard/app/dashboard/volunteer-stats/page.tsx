'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, CheckCircle, Clock, FolderOpen } from 'lucide-react';

interface CasesByStatus {
  open: number;
  investigating: number;
  pending_evidence: number;
  resolved: number;
  closed: number;
}

interface ActivityEntry {
  id: number;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
  case: { id: number; status: string; report: { title: string } };
}

interface VolunteerStats {
  totalAssigned: number;
  casesByStatus: CasesByStatus;
  resolvedThisMonth: number;
  resolvedThisYear: number;
  avgResolutionTimeHours: number;
  recentActivity: ActivityEntry[];
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  investigating: 'bg-yellow-100 text-yellow-800',
  pending_evidence: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  open: 'Open',
  investigating: 'Investigating',
  pending_evidence: 'Pending Evidence',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function VolunteerStatsPage() {
  const [stats, setStats] = useState<VolunteerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/volunteer-stats');
      const data = await res.json();
      setStats(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Unable to load volunteer stats.</p>
      </div>
    );
  }

  const avgHours = stats.avgResolutionTimeHours;
  const avgDisplay = avgHours >= 24 ? `${Math.round(avgHours / 24)}d` : `${avgHours.toFixed(1)}h`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Volunteer Stats</h1>
        <p className="text-muted-foreground">Your case performance metrics and activity</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assigned</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalAssigned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolved This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.resolvedThisMonth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolved This Year</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.resolvedThisYear}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgDisplay}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cases by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-5">
            {Object.entries(stats.casesByStatus).map(([status, count]) => (
              <div key={status} className="flex flex-col items-center rounded-xl border p-4">
                <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
                  {statusLabels[status] || status}
                </Badge>
                <span className="mt-2 text-2xl font-bold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Case #{entry.case.id} — {entry.case.report.title}</span>
                    <span className="text-xs text-muted-foreground">
                      Changed from <Badge variant="outline" className="mx-0.5">{statusLabels[entry.oldStatus] || entry.oldStatus}</Badge>
                      to <Badge variant="outline" className="mx-0.5">{statusLabels[entry.newStatus] || entry.newStatus}</Badge>
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(entry.changedAt).toLocaleDateString()} {new Date(entry.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
