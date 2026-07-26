'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  MessageSquare,
  UserCheck,
  Inbox,
} from 'lucide-react';
import { getRoleFromCookie } from '@/lib/permissions';

const statusColors: Record<string, string> = {
  open: 'bg-red-500/10 text-red-500 border-red-500/20',
  investigating: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  pending: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
  closed: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
};

interface CaseResponse {
  id: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
}

interface MyReport {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  incidentType: string;
  status: string;
  severity: string;
  assignedVolunteerName?: string | null;
  submittedDate: string;
  responses?: CaseResponse[];
}

export default function UserPortalPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [reports, setReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      const r = await getRoleFromCookie();
      setRole(r);
      if (r !== 'admin' && r !== 'volunteer' && r !== 'user') {
        router.replace('/dashboard');
        return;
      }
    };
    checkRole();
  }, [router]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserName(data?.data?.name ?? data?.name ?? '');
        }
      } catch {
        // silently fail
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (role === null) return;
    const fetchReports = async () => {
      setLoading(true);
      setError('');
      try {
        const endpoints = ['/api/reports', '/api/reports/my'];
        let data: any = null;

        for (const endpoint of endpoints) {
          try {
            const res = await fetch(endpoint);
            if (res.ok) {
              const payload = await res.json();
              const list = Array.isArray(payload) ? payload : payload.items ?? payload.reports ?? [];
              if (list.length > 0) {
                data = list;
                break;
              }
            }
          } catch {
            continue;
          }
        }

        if (!data) {
          data = [];
        }

        const mapped: MyReport[] = data.map((item: any) => ({
          id: item.id ?? item._id ?? '',
          ticketNumber: item.ticketNumber ?? item.ticket_number ?? `#${item.id ?? ''}`,
          title: item.title ?? item.description?.slice(0, 50) ?? 'Untitled Report',
          description: item.description ?? '',
          incidentType: item.incidentType ?? item.incident_type ?? item.type ?? 'Other',
          status: item.status ?? 'open',
          severity: item.severity ?? 'medium',
          assignedVolunteerName: item.assignedVolunteerName ?? item.assigned_volunteer_name ?? item.assignedToName ?? null,
          submittedDate: item.submittedDate ?? item.submitted_date ?? item.createdAt ?? item.created_at ?? '',
          responses: (item.responses ?? []).map((r: any) => ({
            id: r.id ?? `r-${Math.random()}`,
            authorName: r.authorName ?? r.author_name ?? 'System',
            authorRole: r.authorRole ?? r.author_role ?? 'admin',
            text: r.text ?? r.responseText ?? r.response_text ?? '',
            createdAt: r.createdAt ?? r.created_at ?? '',
          })),
        }));

        setReports(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [role]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (role === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          Track the status of your reported cases and stay updated on resolutions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <p className="mt-2 text-2xl font-semibold">{reports.length}</p>
              </div>
              <div className="rounded-lg bg-[#2563EB]/10 p-2">
                <FileText className="size-5 text-[#2563EB]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="mt-2 text-2xl font-semibold">
                  {reports.filter((r) => r.status === 'investigating' || r.status === 'pending').length}
                </p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Clock className="size-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="mt-2 text-2xl font-semibold">
                  {reports.filter((r) => r.status === 'resolved' || r.status === 'closed').length}
                </p>
              </div>
              <div className="rounded-lg bg-green-500/10 p-2">
                <CheckCircle2 className="size-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">My Reported Cases</h2>

        {loading ? (
          <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
            Loading your reports...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-10 text-center text-destructive">
            {error}
          </div>
        ) : reports.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Inbox className="size-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No Reports Found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You have not submitted any reports yet.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Card key={report.id} className="glass-card overflow-hidden">
                <button
                  onClick={() => toggleExpand(report.id)}
                  className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <Badge variant="outline" className={statusColors[report.status] ?? statusColors.open}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">{report.ticketNumber}</span>
                      </div>
                      <h3 className="font-medium truncate">{report.title}</h3>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="size-3" />
                          {report.incidentType.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {report.submittedDate
                            ? new Date(report.submittedDate).toLocaleDateString()
                            : 'N/A'}
                        </span>
                        {report.assignedVolunteerName && (
                          <span className="flex items-center gap-1">
                            <UserCheck className="size-3" />
                            {report.assignedVolunteerName}
                          </span>
                        )}
                        {report.responses && report.responses.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="size-3" />
                            {report.responses.length} response{report.responses.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 mt-1">
                      {expandedId === report.id ? (
                        <ChevronUp className="size-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {expandedId === report.id && (
                  <div className="border-t border-border p-4 space-y-4 bg-muted/10">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm leading-relaxed">{report.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Severity</p>
                        <Badge variant="outline" className={
                          report.severity === 'critical'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : report.severity === 'high'
                            ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                            : report.severity === 'medium'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        }>
                          {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Assigned To</p>
                        <p className="text-sm font-medium">
                          {report.assignedVolunteerName ?? 'Unassigned'}
                        </p>
                      </div>
                    </div>

                    {report.responses && report.responses.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                          Responses
                        </p>
                        {report.responses.map((resp) => (
                          <div
                            key={resp.id}
                            className="rounded-lg border border-border bg-card/60 p-3 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{resp.authorName}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">
                                  {resp.authorRole}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {new Date(resp.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{resp.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {(!report.responses || report.responses.length === 0) && (
                      <p className="text-sm text-muted-foreground italic">
                        No responses from our team yet. We&apos;re working on your case.
                      </p>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
