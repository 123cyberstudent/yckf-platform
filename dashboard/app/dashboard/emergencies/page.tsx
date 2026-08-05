'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileDown,
  Filter,
  Loader2,
  MapPin,
  Phone,
  Play,
  Pause,
  Search,
  Siren,
  UserMinus,
  UserPlus,
  Volume2,
} from 'lucide-react';
import { generatePDFReport } from '@/lib/pdf-utils';
import { getRoleFromCookie } from '@/lib/permissions';
import { logExport } from '@/lib/export-logger';
import { useRealtimeEvents } from '@/lib/realtime';

const PAGE_SIZE = 8;

const statusOptions = ['all', 'new', 'under_review', 'assigned', 'in_progress', 'resolved', 'closed'] as const;

const statusColors: Record<string, string> = {
  new: 'bg-red-500/10 text-red-500 border-red-500/20',
  under_review: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  assigned: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  in_progress: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
  closed: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
};

const priorityColors: Record<string, string> = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-amber-500',
  low: 'text-blue-500',
};

interface EmergencyReport {
  id: string;
  ticketNumber: string;
  reporterName: string;
  reporterPhone: string;
  reporterEmail: string;
  nearestStation: string;
  stationDistance: number | null;
  incidentType: string | null;
  mapsLink: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  audioFileUrl: string | null;
  status: string;
  priority: string;
  submittedAt: string;
  description: string;
  assignedVolunteerId: number | null;
  assignedAt: string | null;
  dueAt: string | null;
  assignedBy: { id: number; fullName: string; email: string } | null;
  assignmentHistory: { id: number; assignee: { id: number; fullName: string; role: string }; assignedAt: string; unassignedAt: string | null; note: string | null }[];
}

interface Assignee {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

export default function EmergenciesPage() {
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [assigning, setAssigning] = useState<EmergencyReport | null>(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [assignDue, setAssignDue] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [detail, setDetail] = useState<EmergencyReport | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchAssignees = async () => {
    try {
      const response = await fetch('/api/emergency-reports/assignees');
      if (!response.ok) return;
      const payload = await response.json();
      setAssignees(payload.assignees || []);
    } catch {
      /* non-fatal */
    }
  };

  const fetchReports = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setError('');
    }
    try {
      const response = await fetch('/api/emergency-reports');
      if (!response.ok) throw new Error(`Failed to load emergency reports: ${response.status}`);
      const payload = await response.json();
      const items = (payload.items ?? payload).map((r: any) => ({
        id: r.id?.toString() ?? 'unknown',
        ticketNumber: r.ticketNumber ?? r.ticket_number ?? `ER-${String(r.id).padStart(4, '0')}`,
        reporterName: r.reporterName ?? r.reporter_name ?? r.reporter?.fullName ?? 'Unknown',
        reporterPhone: r.reporterPhone ?? r.reporter_phone ?? r.reporter?.phone ?? '',
        reporterEmail: r.reporterEmail ?? r.reporter_email ?? '',
        nearestStation: r.nearestStation ?? r.nearest_station ?? r.stationName ?? r.station_name ?? r.stationAddress ?? '',
        stationDistance: r.stationDistance ?? r.station_distance ?? null,
        incidentType: r.incidentType ?? r.incident_type ?? null,
        mapsLink: r.mapsLink ?? r.maps_link ?? null,
        gpsLatitude: r.gpsLatitude ?? r.gps_latitude ?? null,
        gpsLongitude: r.gpsLongitude ?? r.gps_longitude ?? null,
        audioFileUrl: r.audioFileUrl ?? r.audio_file_url ?? null,
        status: r.status ?? 'new',
        priority: r.priority ?? 'medium',
        submittedAt: r.submittedAt ?? r.submitted_at ?? r.createdAt ?? new Date().toISOString(),
        description: r.description ?? '',
        assignedVolunteerId: r.assignedVolunteerId ?? null,
        assignedAt: r.assignedAt ?? null,
        dueAt: r.dueAt ?? null,
        assignedBy: r.assignedBy ?? null,
        assignmentHistory: r.assignmentHistory ?? [],
      }));
      setReports(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load emergency reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Real-time: poll for new/updated reports every 10s so incoming emergencies
  // appear immediately without requiring a manual refresh. Keeps the current
  // list visible (no loading flash) while refreshing in the background.
  useEffect(() => {
    const timer = setInterval(() => {
      fetchReports(false);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Real-time: subscribe to socket events pushed by the backend so new
  // emergency reports appear instantly without waiting for the next poll.
  useRealtimeEvents(
    {
      'emergency:new': () => fetchReports(false),
      'emergency:updated': () => fetchReports(false),
      'emergency:assigned': () => fetchReports(false),
    },
    []
  );

  useEffect(() => {
    getRoleFromCookie().then(setCurrentRole);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      const matchesSearch = !q || r.ticketNumber.toLowerCase().includes(q) || r.reporterName.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, search, statusFilter]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const summary = useMemo(() => {
    const newCount = reports.filter((r) => r.status === 'new').length;
    const inProgress = reports.filter((r) => r.status === 'in_progress' || r.status === 'assigned').length;
    const resolved = reports.filter((r) => r.status === 'resolved' || r.status === 'closed').length;
    const critical = reports.filter((r) => r.priority === 'critical').length;
    return { newCount, inProgress, resolved, critical };
  }, [reports]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/emergency-reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const openAssign = (report: EmergencyReport) => {
    setAssigning(report);
    setAssigneeId('');
    setAssignNote('');
    setAssignDue('');
    if (assignees.length === 0) fetchAssignees();
  };

  const handleAssign = async () => {
    if (!assigning) return;
    if (!assigneeId) {
      toast.error('Select a responder to assign');
      return;
    }
    setAssignSaving(true);
    try {
      const response = await fetch(`/api/emergency-reports/${assigning.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          assigneeId: Number(assigneeId),
          assignmentNote: assignNote || undefined,
          dueAt: assignDue ? new Date(assignDue).toISOString() : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload?.error || 'Failed to assign responder');
        return;
      }
      toast.success('Responder assigned');
      setAssigning(null);
      fetchReports();
    } catch {
      toast.error('Failed to assign responder');
    } finally {
      setAssignSaving(false);
    }
  };

  const handleUnassign = async (report: EmergencyReport) => {
    setActingId(report.id);
    try {
      const response = await fetch(`/api/emergency-reports/${report.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unassign' }),
      });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload?.error || 'Failed to unassign');
        return;
      }
      toast.success('Responder unassigned');
      setDetail(null);
      fetchReports();
    } catch {
      toast.error('Failed to unassign');
    } finally {
      setActingId(null);
    }
  };

  const handleExportPdf = () => {
    const isAdmin = currentRole === 'admin';
    const maskedRows = filtered.map((r) => ({
      ...r,
      reporterPhone: isAdmin ? r.reporterPhone : 'REDACTED',
      gpsLatitude: isAdmin ? r.gpsLatitude : null,
      gpsLongitude: isAdmin ? r.gpsLongitude : null,
    }));
    const pdfColumns = [
      { header: 'Ticket', key: 'ticketNumber' },
      { header: 'Reporter', key: 'reporterName' },
      ...(isAdmin ? [{ header: 'Phone', key: 'reporterPhone' }] : []),
      { header: 'Station', key: 'nearestStation' },
      ...(isAdmin ? [{ header: 'GPS Lat', key: 'gpsLatitude' }, { header: 'GPS Lon', key: 'gpsLongitude' }] : []),
      { header: 'Status', key: 'status' },
      { header: 'Priority', key: 'priority' },
      { header: 'Submitted At', key: 'submittedAt' },
    ];
    generatePDFReport({
      title: 'EMERGENCY REPORTS',
      subtitle: `Showing ${filtered.length} of ${reports.length} reports`,
      fileName: 'emergency-reports',
      columns: pdfColumns,
      rows: maskedRows,
      summary: [
        { label: 'Total Reports', value: reports.length },
        { label: 'Pending', value: summary.newCount },
        { label: 'Resolved', value: summary.resolved },
      ],
    });
    logExport('emergencies', 'pdf', filtered.length);
  };

  const handleExportCsv = () => {
    const isAdmin = currentRole === 'admin';
    const headers = isAdmin
      ? ['Ticket', 'Reporter', 'Phone', 'Station', 'GPS Lat', 'GPS Lon', 'Status', 'Priority', 'Submitted At']
      : ['Ticket', 'Reporter', 'Station', 'Status', 'Priority', 'Submitted At'];
    const rows = filtered.map((r) =>
      isAdmin
        ? [r.ticketNumber, r.reporterName, r.reporterPhone, r.nearestStation, r.gpsLatitude ?? '', r.gpsLongitude ?? '', r.status, r.priority, r.submittedAt]
        : [r.ticketNumber, r.reporterName, r.nearestStation, r.status, r.priority, r.submittedAt]
    );
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'emergency-reports.csv';
    link.click();
    URL.revokeObjectURL(url);
    logExport('emergencies', 'csv', filtered.length);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Emergency Reports</h1>
          <p className="text-muted-foreground mt-1">
            Manage incoming emergency reports, assign responders, and track resolution.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="mr-2 size-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'New Reports', value: summary.newCount, icon: Siren },
          { label: 'In Progress', value: summary.inProgress, icon: Clock },
          { label: 'Resolved', value: summary.resolved, icon: CheckCircle2 },
          { label: 'Critical', value: summary.critical, icon: AlertTriangle },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="size-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by ticket number or reporter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                <Filter className="size-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent outline-none"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s === 'all' ? 'All Status' : s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          Loading emergency reports...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-10 text-center text-destructive">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          No emergency reports match the selected filters.
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Ticket</th>
                    <th className="px-4 py-3 text-left font-semibold">Reporter</th>
                    {currentRole === 'admin' && <th className="px-4 py-3 text-left font-semibold">Phone</th>}
                    <th className="px-4 py-3 text-left font-semibold">Nearest Station</th>
                    {currentRole === 'admin' && <th className="px-4 py-3 text-left font-semibold">GPS</th>}
                    <th className="px-4 py-3 text-left font-semibold">Voice</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Priority</th>
                    <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((report) => (
                    <tr key={report.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-[#2563EB]">{report.ticketNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{report.reporterName}</td>
                      {currentRole === 'admin' && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="size-3.5" />
                            {report.reporterPhone || '—'}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-muted-foreground">{report.nearestStation || '—'}</td>
                      {currentRole === 'admin' && (
                        <td className="px-4 py-3">
                          {report.gpsLatitude != null && report.gpsLongitude != null ? (
                            <a
                              href={`https://www.google.com/maps?q=${report.gpsLatitude},${report.gpsLongitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline"
                            >
                              <MapPin className="size-3.5" />
                              {report.gpsLatitude.toFixed(4)}, {report.gpsLongitude.toFixed(4)}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {report.audioFileUrl ? <VoicePlayer url={report.audioFileUrl} /> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusColors[report.status] ?? ''}>
                          {(report.status ?? 'new').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${priorityColors[report.priority] ?? ''}`}>
                          {(report.priority ?? 'medium').charAt(0).toUpperCase() + (report.priority ?? 'medium').slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(report.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={report.status}
                          onChange={(e) => handleStatusUpdate(report.id, e.target.value)}
                          disabled={updatingId === report.id}
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:opacity-50"
                        >
                          {statusOptions.filter((s) => s !== 'all').map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDetail(report)}
                            className="h-7 px-2 text-xs"
                            title="View details"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAssign(report)}
                            className="h-7 px-2 text-xs"
                            title="Assign responder"
                          >
                            <UserPlus className="size-3.5" />
                          </Button>
                          {report.assignedVolunteerId != null && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnassign(report)}
                              disabled={actingId === report.id}
                              className="h-7 px-2 text-xs"
                              title="Unassign"
                            >
                              <UserMinus className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {paged.length} of {filtered.length} emergency reports
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="rounded-md border border-border px-3 py-2 text-sm">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!assigning} onOpenChange={(open) => { if (!open) setAssigning(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign responder</DialogTitle>
            <DialogDescription>
              {assigning ? `Assign ${assigning.ticketNumber} to a volunteer or investigator` : 'Assign this emergency report'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Responder</label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a responder" />
                </SelectTrigger>
                <SelectContent>
                  {assignees.length === 0 ? (
                    <SelectItem value="__none__" disabled>No assignees available</SelectItem>
                  ) : (
                    assignees.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.fullName || a.email} ({a.role.replace('_', ' ').toLowerCase()})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignment note</label>
              <Input
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                placeholder="e.g. Please respond urgently, reporter is at..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due by</label>
              <Input
                type="datetime-local"
                value={assignDue}
                onChange={(e) => setAssignDue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigning(null)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assignSaving}>
              {assignSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UserPlus className="mr-2 size-4" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report {detail?.ticketNumber}</DialogTitle>
            <DialogDescription>
              {detail?.incidentType ? `Incident: ${String(detail.incidentType).replace(/_/g, ' ')}` : 'Emergency report details'}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={statusColors[detail.status] ?? ''}>
                  {(detail.status ?? 'new').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Badge>
                <span className={`font-medium ${priorityColors[detail.priority] ?? ''}`}>
                  {detail.priority.charAt(0).toUpperCase() + detail.priority.slice(1)} priority
                </span>
                {detail.assignedVolunteerId != null && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    Assigned
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Reporter</p>
                  <p className="font-medium">{detail.reporterName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{detail.reporterEmail || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{currentRole === 'admin' ? detail.reporterPhone || '—' : 'REDACTED'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nearest station</p>
                  <p className="font-medium">{detail.nearestStation || '—'}{detail.stationDistance != null ? ` · ${Math.round(detail.stationDistance)}m` : ''}</p>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="mt-1 whitespace-pre-wrap">{detail.description || 'No text description'}</p>
                {detail.mapsLink ? (
                  <a href={detail.mapsLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline">
                    <MapPin className="size-3.5" /> Open in Google Maps
                  </a>
                ) : detail.gpsLatitude != null && detail.gpsLongitude != null ? (
                  <a href={`https://www.google.com/maps?q=${detail.gpsLatitude},${detail.gpsLongitude}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline">
                    <MapPin className="size-3.5" /> {detail.gpsLatitude.toFixed(4)}, {detail.gpsLongitude.toFixed(4)}
                  </a>
                ) : null}
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Assignment</p>
                {detail.assignmentHistory.length === 0 ? (
                  <p className="mt-1 text-muted-foreground">Not assigned yet</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {detail.assignmentHistory.map((h) => (
                      <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span>
                          {h.assignee.fullName || 'Responder'} ({h.assignee.role.replace('_', ' ').toLowerCase()})
                          {h.unassignedAt ? ' — unassigned' : ' — current'}
                        </span>
                        <span className="text-muted-foreground">{new Date(h.assignedAt).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {detail.assignedVolunteerId != null && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => handleUnassign(detail)} disabled={actingId === detail.id}>
                    {actingId === detail.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UserMinus className="mr-2 size-4" />}
                    Unassign responder
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VoicePlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!audioRef.current) {
      setLoading(true);
      try {
        const response = await fetch(`/api/emergency-reports/audio?filename=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Failed to load audio');
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        audioRef.current = new Audio(objectUrl);
        audioRef.current.onended = () => setPlaying(false);
        audioRef.current.play();
        setPlaying(true);
      } catch (err) {
        console.error('Audio playback failed:', err);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-md border border-[#2563EB]/30 bg-[#2563EB]/10 px-2 py-1 text-xs text-[#2563EB] hover:bg-[#2563EB]/20 transition-colors"
      title="Play voice recording"
    >
      {loading ? <Loader2 className="size-3 animate-spin" /> : playing ? <Pause className="size-3" /> : <Play className="size-3" />}
      <Volume2 className="size-3" />
    </button>
  );
}
