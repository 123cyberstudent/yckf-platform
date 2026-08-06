'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isStaff } from '@/lib/permissions';
import { DashboardOverview } from '@/components/dashboard/overview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface AssignedReport {
  id: number;
  ticketNumber: string;
  incidentType: string | null;
  description: string | null;
  status: string;
  priority: string;
  assignmentNote: string | null;
  assignedAt: string | null;
  dueAt: string | null;
  mapsLink: string | null;
  stationName: string | null;
  gpsAddress: string | null;
  reporterName: string | null;
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
};

const priorityStyles: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-gray-100 text-gray-700',
  low: 'bg-gray-100 text-gray-500',
};

export default function VolunteerDashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<AssignedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    isStaff().then((allowed) => {
      if (!allowed) {
        router.replace('/login');
      }
    });
  }, [router]);

  const fetchAssigned = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/emergency-reports/assigned-to-me');
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to load assigned cases');
        setReports([]);
        return;
      }
      setReports(data.reports || []);
    } catch {
      toast.error('Failed to load assigned cases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssigned();
  }, [fetchAssigned]);

  const updateStatus = async (report: AssignedReport, status: 'in_progress' | 'resolved') => {
    setUpdating(report.id);
    try {
      const res = await fetch(`/api/emergency-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || 'Failed to update status');
        return;
      }
      toast.success(status === 'in_progress' ? 'Case marked in progress' : 'Case marked resolved');
      fetchAssigned();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Volunteer/Investigator Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage cases and investigations</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Assigned Cases</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchAssigned} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading assigned cases...</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No emergency reports are currently assigned to you.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2">Ticket</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Assigned</th>
                    <th className="px-3 py-2">Due</th>
                    <th className="px-3 py-2">Note</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b last:border-0 align-top">
                      <td className="px-3 py-3 text-sm font-medium">{report.ticketNumber}</td>
                      <td className="px-3 py-3">
                        <Badge className={priorityStyles[report.priority] ?? 'bg-gray-100 text-gray-700'}>
                          {report.priority}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={statusStyles[report.status] ?? 'bg-gray-100 text-gray-700'}>
                          {report.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">
                        {report.assignedAt ? new Date(report.assignedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">
                        {report.dueAt ? new Date(report.dueAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground max-w-56">
                        {report.assignmentNote || '—'}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {report.mapsLink ? (
                          <a
                            href={report.mapsLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <MapPin className="h-3.5 w-3.5" /> Map
                          </a>
                        ) : (
                          report.gpsAddress || report.stationName || '—'
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          {report.status === 'assigned' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updating === report.id}
                              onClick={() => updateStatus(report, 'in_progress')}
                            >
                              Start
                            </Button>
                          ) : null}
                          {report.status !== 'resolved' ? (
                            <Button
                              size="sm"
                              disabled={updating === report.id}
                              onClick={() => updateStatus(report, 'resolved')}
                            >
                              Resolve
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <DashboardOverview />
    </div>
  );
}
