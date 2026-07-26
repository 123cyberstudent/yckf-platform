'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Download, FileDown, Filter, Plus, Search, ShieldCheck, X } from 'lucide-react';
import type { Incident } from '@/lib/types';
import { getRoleFromCookie } from '@/lib/permissions';
import { generatePDFReport } from '@/lib/pdf-utils';
import { logExport } from '@/lib/export-logger';

const PAGE_SIZE = 6;

const severityColors: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-500/10 text-red-500',
  investigating: 'bg-amber-500/10 text-amber-500',
  pending: 'bg-blue-500/10 text-blue-500',
  resolved: 'bg-green-500/10 text-green-500',
  closed: 'bg-slate-500/10 text-slate-300',
};

const priorityColors: Record<string, string> = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-amber-500',
  low: 'text-blue-500',
};

export function IncidentsList() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState('phishing');
  const [formPriority, setFormPriority] = useState('medium');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getRoleFromCookie().then(setCurrentRole);
  }, []);

  const canPerformActions = currentRole === 'admin';

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/incidents');
      if (!response.ok) throw new Error('Failed to fetch incidents');
      const payload = await response.json();
      const items = payload.items ?? payload;

      const headers = ['ID', 'Status', 'Report Title', 'Assigned Investigator', 'Created At'];
      const rows = items.map((item: any) => [
        item.id,
        item.status,
        item.title,
        item.assignedToName || 'Unassigned',
        item.createdAt,
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'incidents.csv';
      link.click();
      URL.revokeObjectURL(url);
      logExport('incidents', 'csv', items.length);
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    const open = incidents.filter((i) => i.status === 'open' || i.status === 'investigating').length;
    const critical = incidents.filter((i) => i.severity === 'critical').length;

    generatePDFReport({
      title: 'INCIDENT MANAGEMENT REPORT',
      subtitle: `Total: ${incidents.length} | Open: ${open} | Critical: ${critical}`,
      columns: [
        { header: 'ID', key: 'id' },
        { header: 'Title', key: 'title' },
        { header: 'Type', key: 'category' },
        { header: 'Severity', key: 'severity' },
        { header: 'Status', key: 'status' },
        { header: 'Reported By', key: 'reportedByName' },
        { header: 'Assigned To', key: 'assignedToName' },
        { header: 'Created At', key: 'createdAt' },
      ],
      rows: filteredIncidents.map((i) => ({
        ...i,
        assignedToName: i.assignedToName ?? 'Unassigned',
      })),
      fileName: 'incidents-report',
      summary: [
        { label: 'Total Incidents', value: incidents.length },
        { label: 'Open', value: open },
        { label: 'Critical', value: critical },
      ],
    });
    logExport('incidents', 'pdf', filteredIncidents.length);
  };

  const fetchIncidents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/incidents');
      if (!response.ok) {
        throw new Error(`Failed to load incidents: ${response.status}`);
      }
      const payload = await response.json();
      const parsed = (payload.items ?? payload).map((incident: any) => ({
        ...incident,
        priority: incident.priority ?? 'medium',
        category: incident.category ?? incident.type,
        createdAt: new Date(incident.createdAt),
        updatedAt: new Date(incident.updatedAt),
        resolvedAt: incident.resolvedAt ? new Date(incident.resolvedAt) : null,
        notes: (incident.notes ?? []).map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
        })),
      }));
      setIncidents(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter, priorityFilter, assignedFilter, sortOrder]);

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = incidents.filter((incident) => {
      const matchesQuery = !query || [incident.title, incident.description, incident.reportedByName, incident.assignedToName ?? ''].join(' ').toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || incident.category === categoryFilter || incident.type === categoryFilter;
      const matchesPriority = priorityFilter === 'all' || (incident.priority ?? 'medium') === priorityFilter;
      const matchesAssigned = assignedFilter === 'all' || (incident.assignedToName ?? 'Unassigned').toLowerCase().includes(assignedFilter.toLowerCase());
      return matchesQuery && matchesStatus && matchesCategory && matchesPriority && matchesAssigned;
    });

    return [...result].sort((a, b) => {
      const first = new Date(a.createdAt).getTime();
      const second = new Date(b.createdAt).getTime();
      return sortOrder === 'oldest' ? first - second : second - first;
    });
  }, [incidents, search, statusFilter, categoryFilter, priorityFilter, assignedFilter, sortOrder]);

  const pagedIncidents = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredIncidents.slice(start, start + PAGE_SIZE);
  }, [filteredIncidents, page]);

  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / PAGE_SIZE));

  const summary = useMemo(() => {
    const open = incidents.filter((incident) => incident.status === 'open' || incident.status === 'investigating').length;
    const critical = incidents.filter((incident) => incident.severity === 'critical').length;
    const resolved = incidents.filter((incident) => incident.status === 'resolved' || incident.status === 'closed').length;
    const avgResponse = incidents.length > 0 ? `${(incidents.reduce((sum, incident) => sum + (incident.priority === 'critical' ? 4 : incident.priority === 'high' ? 3 : 2), 0) / incidents.length).toFixed(1)}h` : '0.0h';
    return { open, critical, resolved, avgResponse };
  }, [incidents]);

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const applyBulkAction = async (action: 'investigating' | 'resolved' | 'closed') => {
    if (selectedIds.length === 0) return;
    const updated = incidents.map((incident) =>
      selectedIds.includes(incident.id) ? { ...incident, status: action, updatedAt: new Date() } : incident
    );
    setIncidents(updated);
    setSelectedIds([]);
  };

  const handleCreateIncident = async () => {
    if (!formTitle.trim()) {
      setCreateError('Title is required');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          type: formType,
          priority: formPriority,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to create incident (${response.status})`);
      }
      setDialogOpen(false);
      setFormTitle('');
      setFormDescription('');
      setFormType('phishing');
      setFormPriority('medium');
      await fetchIncidents();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create incident');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Incident Management</h1>
          <p className="text-muted-foreground mt-1">Monitor alerts, coordinate response, and track resolution progress.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} disabled={exporting}>
            <Download className="mr-2 size-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="mr-2 size-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={() => setDialogOpen(true)} className={currentRole && currentRole !== 'admin' ? 'hidden' : ''}>
            <Plus className="mr-2 size-4" />
            Create Incident
          </Button>
          <Button onClick={() => applyBulkAction('investigating')} disabled={selectedIds.length === 0} className={currentRole && currentRole !== 'admin' ? 'hidden' : ''}>
            Update Selected
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Open Incidents', value: summary.open, icon: AlertTriangle },
          { label: 'Critical Alerts', value: summary.critical, icon: ShieldCheck },
          { label: 'Resolved', value: summary.resolved, icon: CheckCircle2 },
          { label: 'Avg Response', value: summary.avgResponse, icon: CalendarDays },
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
              <Input placeholder="Search incidents or reporters" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                <Filter className="size-4" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="bg-transparent outline-none">
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                <Filter className="size-4" />
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="bg-transparent outline-none">
                  <option value="all">All Categories</option>
                  <option value="malware">Malware</option>
                  <option value="phishing">Phishing</option>
                  <option value="data_breach">Data Breach</option>
                  <option value="ddos">DDoS</option>
                  <option value="ransomware">Ransomware</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                <Filter className="size-4" />
                <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="bg-transparent outline-none">
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                <Filter className="size-4" />
                <select value={assignedFilter} onChange={(event) => setAssignedFilter(event.target.value)} className="bg-transparent outline-none">
                  <option value="all">All Assignees</option>
                  <option value="mike">Mike</option>
                  <option value="emily">Emily</option>
                  <option value="james">James</option>
                  <option value="sarah">Sarah</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                <Filter className="size-4" />
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="bg-transparent outline-none">
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">Loading incidents...</div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-10 text-center text-destructive">{error}</div>
      ) : filteredIncidents.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">No incidents match the selected filters.</div>
      ) : (
        <div className="space-y-4">
          <Card className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    {canPerformActions && <th className="px-4 py-3 text-left font-semibold">Select</th>}
                    <th className="px-4 py-3 text-left font-semibold">Incident</th>
                    <th className="px-4 py-3 text-left font-semibold">Severity</th>
                    <th className="px-4 py-3 text-left font-semibold">Priority</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Reporter</th>
                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedIncidents.map((incident) => (
                    <tr key={incident.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      {canPerformActions && (
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.includes(incident.id)} onChange={() => toggleSelection(incident.id)} className="size-4 rounded border-border" />
                      </td>
                      )}
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{incident.title}</p>
                          <p className="text-xs text-muted-foreground">{incident.description.slice(0, 70)}{incident.description.length > 70 ? '…' : ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={severityColors[incident.severity]}>
                          {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${priorityColors[incident.priority ?? 'medium']}`}>
                          {(incident.priority ?? 'medium').charAt(0).toUpperCase() + (incident.priority ?? 'medium').slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusColors[incident.status]}>
                          {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{incident.reportedByName}</td>
                      <td className="px-4 py-3">
                        <Link href={`/incidents/${incident.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">Showing {pagedIncidents.length} of {filteredIncidents.length} incidents</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="rounded-md border border-border px-3 py-2 text-sm">{page} / {totalPages}</span>
              <Button variant="outline" size="icon" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !creating && setDialogOpen(false)} />
          <div className="relative z-50 w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create Incident</h2>
              <button onClick={() => !creating && setDialogOpen(false)} className="rounded-md p-1 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <Input placeholder="Incident title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} disabled={creating} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe the incident"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    disabled={creating}
                    className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="malware">Malware</option>
                    <option value="phishing">Phishing</option>
                    <option value="data_breach">Data Breach</option>
                    <option value="ddos">DDoS</option>
                    <option value="ransomware">Ransomware</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    disabled={creating}
                    className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              {createError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{createError}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>Cancel</Button>
                <Button onClick={handleCreateIncident} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Incident'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
