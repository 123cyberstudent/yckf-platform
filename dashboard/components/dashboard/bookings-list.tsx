'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Download, FileDown, Filter, Search, Ticket, Users, XCircle, Clock } from 'lucide-react';
import { generatePDFReport } from '@/lib/pdf-utils';

const PAGE_SIZE = 10;

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  confirmed: 'bg-green-500/10 text-green-500 border-green-500/20',
  in_progress: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface Booking {
  id: string;
  ticketNumber: string;
  fullName: string;
  email: string;
  phone: string;
  specialist: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export function BookingsList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) {
        throw new Error(`Failed to load bookings: ${response.status}`);
      }
      const payload = await response.json();
      const parsed = (payload.items ?? payload).map((booking: any) => ({
        ...booking,
        createdAt: new Date(booking.createdAt),
        updatedAt: new Date(booking.updatedAt),
      }));
      setBookings(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortOrder]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = bookings.filter((booking) => {
      const matchesQuery = !query || [booking.ticketNumber, booking.fullName, booking.email].join(' ').toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      return matchesQuery && matchesStatus;
    });

    return [...result].sort((a, b) => {
      const first = new Date(a.createdAt).getTime();
      const second = new Date(b.createdAt).getTime();
      return sortOrder === 'oldest' ? first - second : second - first;
    });
  }, [bookings, search, statusFilter, sortOrder]);

  const pagedBookings = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, page]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));

  const summary = useMemo(() => {
    const newCount = bookings.filter((b) => b.status === 'new').length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const inProgress = bookings.filter((b) => b.status === 'in_progress').length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    return { newCount, confirmed, inProgress, completed };
  }, [bookings]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus, updatedAt: new Date() } : b))
      );
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportPdf = () => {
    generatePDFReport({
      title: 'BOOKING REPORT',
      subtitle: `Showing ${filteredBookings.length} of ${bookings.length} bookings`,
      fileName: 'bookings-report',
      columns: [
        { header: 'Ticket', key: 'ticketNumber' },
        { header: 'Name', key: 'fullName' },
        { header: 'Email', key: 'email' },
        { header: 'Phone', key: 'phone' },
        { header: 'Specialist', key: 'specialist' },
        { header: 'Preferred Date', key: 'preferredDate' },
        { header: 'Preferred Time', key: 'preferredTime' },
        { header: 'Status', key: 'status' },
        { header: 'Submitted At', key: 'createdAt' },
      ],
      rows: filteredBookings,
      summary: [
        { label: 'Total Bookings', value: bookings.length },
        { label: 'Pending', value: summary.newCount },
        { label: 'Confirmed', value: summary.confirmed },
      ],
    });
  };

  const handleExportCsv = () => {
    const headers = ['Ticket Number', 'Full Name', 'Email', 'Phone', 'Specialist', 'Preferred Date', 'Preferred Time', 'Status', 'Submitted At'];
    const rows = filteredBookings.map((b) => [
      b.ticketNumber,
      b.fullName,
      b.email,
      b.phone,
      b.specialist,
      b.preferredDate,
      b.preferredTime,
      b.status,
      b.createdAt,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bookings.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Booking Management</h1>
          <p className="text-muted-foreground mt-1">Manage client bookings, confirm appointments, and track scheduling status.</p>
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
          { label: 'New Bookings', value: summary.newCount, icon: Ticket },
          { label: 'Confirmed', value: summary.confirmed, icon: CheckCircle2 },
          { label: 'In Progress', value: summary.inProgress, icon: Clock },
          { label: 'Completed', value: summary.completed, icon: Users },
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
              <Input placeholder="Search by ticket number or name" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                <Filter className="size-4" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="bg-transparent outline-none">
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
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
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">Loading bookings...</div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-10 text-center text-destructive">{error}</div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">No bookings match the selected filters.</div>
      ) : (
        <div className="space-y-4">
          <Card className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Ticket</th>
                    <th className="px-4 py-3 text-left font-semibold">Full Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold">Specialist</th>
                    <th className="px-4 py-3 text-left font-semibold">Preferred Date/Time</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedBookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium">{booking.ticketNumber}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">{booking.fullName}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{booking.email}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{booking.phone}</td>
                      <td className="px-4 py-3 text-sm">{booking.specialist}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {booking.preferredDate}
                        {booking.preferredTime ? ` ${booking.preferredTime}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusColors[booking.status] ?? statusColors.new}>
                          {(booking.status ?? 'new').replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {booking.status === 'new' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={updatingId === booking.id}
                                onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={updatingId === booking.id}
                                onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                              >
                                <XCircle className="size-3.5" />
                              </Button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={updatingId === booking.id}
                              onClick={() => handleStatusUpdate(booking.id, 'in_progress')}
                            >
                              Start
                            </Button>
                          )}
                          {booking.status === 'in_progress' && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={updatingId === booking.id}
                              onClick={() => handleStatusUpdate(booking.id, 'completed')}
                            >
                              Complete
                            </Button>
                          )}
                          {(booking.status === 'completed' || booking.status === 'cancelled') && (
                            <span className="text-xs text-muted-foreground">—</span>
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
            <p className="text-sm text-muted-foreground">Showing {pagedBookings.length} of {filteredBookings.length} bookings</p>
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
    </div>
  );
}
