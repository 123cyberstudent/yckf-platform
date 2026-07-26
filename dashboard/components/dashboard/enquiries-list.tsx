'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Download, FileDown, Filter, Mail, MessageSquare, Phone, Search, X } from 'lucide-react';
import { generatePDFReport } from '@/lib/pdf-utils';
import { getRoleFromCookie } from '@/lib/permissions';
import { logExport } from '@/lib/export-logger';

const PAGE_SIZE = 10;

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  replied: 'bg-green-500/10 text-green-500 border-green-500/20',
  closed: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
};

const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  phone: Phone,
  web: MessageSquare,
  sms: MessageSquare,
};

export function EnquiriesList() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogEnquiry, setStatusDialogEnquiry] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('new');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fetchEnquiries = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/enquiries');
      if (!response.ok) {
        throw new Error(`Failed to load enquiries: ${response.status}`);
      }
      const payload = await response.json();
      const items = (payload.items ?? payload).map((enquiry: any) => ({
        ...enquiry,
        createdAt: new Date(enquiry.createdAt),
        updatedAt: new Date(enquiry.updatedAt),
      }));
      setEnquiries(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load enquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  useEffect(() => { getRoleFromCookie().then(setCurrentRole); }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortOrder]);

  const filteredEnquiries = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = enquiries.filter((enquiry) => {
      const matchesQuery = !query || [enquiry.ticketNumber, enquiry.name, enquiry.email, enquiry.subject].join(' ').toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || enquiry.status === statusFilter;
      return matchesQuery && matchesStatus;
    });

    return [...result].sort((a, b) => {
      const first = new Date(a.createdAt).getTime();
      const second = new Date(b.createdAt).getTime();
      return sortOrder === 'oldest' ? first - second : second - first;
    });
  }, [enquiries, search, statusFilter, sortOrder]);

  const pagedEnquiries = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredEnquiries.slice(start, start + PAGE_SIZE);
  }, [filteredEnquiries, page]);

  const totalPages = Math.max(1, Math.ceil(filteredEnquiries.length / PAGE_SIZE));

  const summary = useMemo(() => {
    const all = enquiries.length;
    const newCount = enquiries.filter((e) => e.status === 'new').length;
    const inProgress = enquiries.filter((e) => e.status === 'in_progress').length;
    const replied = enquiries.filter((e) => e.status === 'replied').length;
    return { all, newCount, inProgress, replied };
  }, [enquiries]);

  const handleExportPdf = () => {
    const isAdmin = currentRole === 'admin';
    const maskedRows = filteredEnquiries.map((e) => ({
      ...e,
      email: isAdmin ? e.email : 'REDACTED',
      phone: isAdmin ? e.phone : 'REDACTED',
    }));
    generatePDFReport({
      title: 'ENQUIRY REPORT',
      subtitle: `Showing ${filteredEnquiries.length} of ${enquiries.length} enquiries`,
      fileName: 'enquiries-report',
      columns: [
        { header: 'Ticket', key: 'ticketNumber' },
        { header: 'Name', key: 'name' },
        { header: 'Email', key: 'email' },
        { header: 'Phone', key: 'phone' },
        { header: 'Subject', key: 'subject' },
        { header: 'Channel', key: 'channel' },
        { header: 'Status', key: 'status' },
        { header: 'Submitted At', key: 'createdAt' },
      ],
      rows: maskedRows,
      summary: [
        { label: 'Total Enquiries', value: enquiries.length },
        { label: 'New', value: summary.newCount },
        { label: 'Open', value: summary.inProgress },
      ],
    });
    logExport('enquiries', 'pdf', filteredEnquiries.length);
  };

  const handleExportCsv = () => {
    const isAdmin = currentRole === 'admin';
    const headers = ['Ticket', 'Name', 'Email', 'Phone', 'Subject', 'Channel', 'Status', 'Submitted At'];
    const rows = filteredEnquiries.map((e) => [
      e.ticketNumber,
      e.name,
      isAdmin ? e.email : 'REDACTED',
      isAdmin ? e.phone : 'REDACTED',
      e.subject,
      e.channel,
      e.status,
      new Date(e.createdAt).toISOString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'enquiries.csv';
    link.click();
    URL.revokeObjectURL(url);
    logExport('enquiries', 'csv', filteredEnquiries.length);
  };

  const openStatusDialog = (enquiry: any) => {
    setStatusDialogEnquiry(enquiry);
    setNewStatus(enquiry.status);
    setAdminNotes(enquiry.adminNotes ?? '');
    setSaveError('');
    setStatusDialogOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!statusDialogEnquiry) return;
    setSaving(true);
    setSaveError('');
    setUpdatingId(statusDialogEnquiry.id);
    try {
      const response = await fetch(`/api/enquiries/${statusDialogEnquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, adminNotes: adminNotes.trim() || undefined }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to update (${response.status})`);
      }
      setEnquiries((prev) =>
        prev.map((e) =>
          e.id === statusDialogEnquiry.id ? { ...e, status: newStatus, adminNotes: adminNotes.trim() || e.adminNotes, updatedAt: new Date() } : e
        )
      );
      setStatusDialogOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update enquiry');
    } finally {
      setSaving(false);
      setUpdatingId(null);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enquiry Management</h1>
          <p className="text-muted-foreground mt-1">Manage and respond to user enquiries and support tickets.</p>
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
          { label: 'Total Enquiries', value: summary.all },
          { label: 'New', value: summary.newCount },
          { label: 'In Progress', value: summary.inProgress },
          { label: 'Replied', value: summary.replied },
        ].map((card) => (
          <Card key={card.label} className="glass-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input placeholder="Search by ticket number or name" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                <Filter className="size-4" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="bg-transparent outline-none">
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
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
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">Loading enquiries...</div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-10 text-center text-destructive">{error}</div>
      ) : filteredEnquiries.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">No enquiries match the selected filters.</div>
      ) : (
        <div className="space-y-4">
          <Card className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Ticket</th>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    {currentRole === 'admin' && <th className="px-4 py-3 text-left font-semibold">Email</th>}
                    {currentRole === 'admin' && <th className="px-4 py-3 text-left font-semibold">Phone</th>}
                    <th className="px-4 py-3 text-left font-semibold">Subject</th>
                    <th className="px-4 py-3 text-left font-semibold">Channel</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Submitted At</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedEnquiries.map((enquiry) => {
                    const ChannelIcon = channelIcons[enquiry.channel] ?? MessageSquare;
                    return (
                      <tr key={enquiry.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-medium text-primary">{enquiry.ticketNumber}</span>
                        </td>
                        <td className="px-4 py-3 font-medium">{enquiry.name}</td>
                        {currentRole === 'admin' && <td className="px-4 py-3 text-sm text-muted-foreground">{enquiry.email}</td>}
                        {currentRole === 'admin' && <td className="px-4 py-3 text-sm text-muted-foreground">{enquiry.phone || '—'}</td>}
                        <td className="px-4 py-3">
                          <div className="max-w-[200px] truncate text-sm" title={enquiry.subject}>{enquiry.subject}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <ChannelIcon className="size-3.5" />
                            {enquiry.channel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusColors[enquiry.status]}>
                            {(enquiry.status ?? 'new').replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(enquiry.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openStatusDialog(enquiry)}
                            disabled={updatingId === enquiry.id}
                          >
                            {updatingId === enquiry.id ? 'Updating...' : 'Manage'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">Showing {pagedEnquiries.length} of {filteredEnquiries.length} enquiries</p>
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

      {statusDialogOpen && statusDialogEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setStatusDialogOpen(false)} />
          <div className="relative z-50 w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Update Enquiry</h2>
                <p className="text-sm text-muted-foreground font-mono">{statusDialogEnquiry.ticketNumber}</p>
              </div>
              <button onClick={() => !saving && setStatusDialogOpen(false)} className="rounded-md p-1 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-4 mb-4 text-sm space-y-1">
              <p><span className="font-medium">Name:</span> {statusDialogEnquiry.name}</p>
              <p><span className="font-medium">Email:</span> {statusDialogEnquiry.email}</p>
              {statusDialogEnquiry.phone && <p><span className="font-medium">Phone:</span> {statusDialogEnquiry.phone}</p>}
              <p><span className="font-medium">Subject:</span> {statusDialogEnquiry.subject}</p>
              <p className="mt-2 text-muted-foreground">{statusDialogEnquiry.message}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  disabled={saving}
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Admin Notes</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Add notes (optional)"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  disabled={saving}
                />
              </div>
              {saveError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{saveError}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setStatusDialogOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleStatusUpdate} disabled={saving} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
                  {saving ? 'Saving...' : 'Update Status'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
