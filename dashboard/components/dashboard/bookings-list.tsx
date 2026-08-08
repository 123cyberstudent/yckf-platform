'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, ChevronLeft, ChevronRight, Download, FileDown, Filter, Search, Ticket, Users, XCircle, Clock, UserCheck, X, Mail, MessageCircle } from 'lucide-react';
import { generatePDFReport } from '@/lib/pdf-utils';
import { getRoleFromCookie } from '@/lib/permissions';
import { logExport } from '@/lib/export-logger';

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

const bookingMessage = (b: Booking) =>
  `Dear ${b.fullName},\n\nThank you for booking a consultation with Young Cyber Knights Foundation (Ticket ${b.ticketNumber}).\n\nBooking details:\n- Service: ${b.specialist || 'General consultation'}\n- Preferred date: ${b.preferredDate}\n- Preferred time: ${b.preferredTime || 'To be confirmed'}\n\nWe will reach out to confirm your appointment shortly.\n\nBest regards,\nYoung Cyber Knights Foundation`;

const emailHref = (b: Booking) =>
  `mailto:${b.email}?subject=${encodeURIComponent(`Booking ${b.ticketNumber} - Young Cyber Knights Foundation`)}&body=${encodeURIComponent(bookingMessage(b))}`;

const whatsappHref = (b: Booking) =>
  `https://wa.me/${String(b.phone).replace(/\D/g, '')}?text=${encodeURIComponent(bookingMessage(b))}`;

interface Specialist {
  id: number;
  name: string;
  email: string;
  specialty: string;
}

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
  createdAt: Date | string;
  updatedAt: Date | string;
  assignedSpecialist: Specialist | null;
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
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Booking | null>(null);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [specialistSearch, setSpecialistSearch] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => { getRoleFromCookie().then(setCurrentRole); }, []);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) {
        throw new Error(`Failed to load bookings: ${response.status}`);
      }
      const payload = await response.json();
      const parsed = (payload.items ?? payload).map((booking: Booking) => ({
        ...booking,
        createdAt: new Date(booking.createdAt),
        updatedAt: new Date(booking.updatedAt),
        assignedSpecialist: booking.assignedSpecialist ?? null,
      }));
      setBookings(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecialists = async () => {
    try {
      const res = await fetch('/api/specialists');
      if (res.ok) {
        const data = await res.json();
        setSpecialists(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchBookings();
    fetchSpecialists();
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
        prev.map((b) => (b.id === id ? { ...b, status: newStatus, updatedAt: new Date().toISOString() } : b))
      );
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const openAssign = (booking: Booking) => {
    setAssignTarget(booking);
    setSpecialistSearch('');
    setAssignOpen(true);
  };

  const handleAssign = async (specialistId: number) => {
    if (!assignTarget) return;
    setAssignLoading(true);
    try {
      const response = await fetch(`/api/bookings/${assignTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: assignTarget.status, assignedSpecialistId: specialistId }),
      });
      if (!response.ok) throw new Error('Failed to assign specialist');
      const data = await response.json();
      setBookings((prev) =>
        prev.map((b) => b.id === assignTarget.id ? { ...b, assignedSpecialist: data.assignedSpecialist ?? specialists.find((s) => s.id === specialistId) ?? null } : b)
      );
      setAssignOpen(false);
      setAssignTarget(null);
    } catch (err) {
      console.error('Assign failed:', err);
    } finally {
      setAssignLoading(false);
    }
  };

  const filteredSpecialists = useMemo(() => {
    const q = specialistSearch.trim().toLowerCase();
    return specialists.filter((s) => {
      if (!q) return true;
      return `${s.name} ${s.email} ${s.specialty}`.toLowerCase().includes(q);
    });
  }, [specialists, specialistSearch]);

  const handleExportPdf = () => {
    const isAdmin = currentRole === 'admin';
    const maskedRows = filteredBookings.map((b) => ({
      ...b,
      email: isAdmin ? b.email : 'REDACTED',
      phone: isAdmin ? b.phone : 'REDACTED',
      assignedTo: b.assignedSpecialist?.name || 'Unassigned',
    }));
    generatePDFReport({
      title: 'BOOKING REPORT',
      subtitle: `Showing ${filteredBookings.length} of ${bookings.length} bookings`,
      fileName: 'bookings-report',
      columns: [
        { header: 'Ticket', key: 'ticketNumber' },
        { header: 'Name', key: 'fullName' },
        { header: 'Email', key: 'email' },
        { header: 'Phone', key: 'phone' },
        { header: 'Specialist Type', key: 'specialist' },
        { header: 'Assigned To', key: 'assignedTo' },
        { header: 'Preferred Date', key: 'preferredDate' },
        { header: 'Preferred Time', key: 'preferredTime' },
        { header: 'Status', key: 'status' },
        { header: 'Submitted At', key: 'createdAt' },
      ],
      rows: maskedRows,
      summary: [
        { label: 'Total Bookings', value: bookings.length },
        { label: 'Pending', value: summary.newCount },
        { label: 'Confirmed', value: summary.confirmed },
      ],
    });
    logExport('bookings', 'pdf', filteredBookings.length);
  };

  const handleExportCsv = () => {
    const isAdmin = currentRole === 'admin';
    const headers = ['Ticket Number', 'Full Name', 'Email', 'Phone', 'Specialist Type', 'Assigned To', 'Preferred Date', 'Preferred Time', 'Status', 'Submitted At'];
    const rows = filteredBookings.map((b) => [
      b.ticketNumber,
      b.fullName,
      isAdmin ? b.email : 'REDACTED',
      isAdmin ? b.phone : 'REDACTED',
      b.specialist,
      b.assignedSpecialist?.name || 'Unassigned',
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
    logExport('bookings', 'csv', filteredBookings.length);
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
                    {currentRole === 'admin' && <th className="px-4 py-3 text-left font-semibold">Email</th>}
                    {currentRole === 'admin' && <th className="px-4 py-3 text-left font-semibold">Phone</th>}
                    <th className="px-4 py-3 text-left font-semibold">Specialist</th>
                    <th className="px-4 py-3 text-left font-semibold">Assigned To</th>
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
                      {currentRole === 'admin' && <td className="px-4 py-3 text-sm text-muted-foreground">{booking.email}</td>}
                      {currentRole === 'admin' && <td className="px-4 py-3 text-sm text-muted-foreground">{booking.phone}</td>}
                      <td className="px-4 py-3 text-sm">{booking.specialist || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {booking.assignedSpecialist ? (
                          <Badge variant="outline" className="bg-[#2563EB]/10 text-[#2563EB]">
                            <UserCheck className="size-3 mr-1" />
                            {booking.assignedSpecialist.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </td>
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
                        <div className="flex gap-1 flex-wrap">
                          {booking.status === 'new' && (
                            <>
                              <Button variant="outline" size="sm" disabled={updatingId === booking.id} onClick={() => handleStatusUpdate(booking.id, 'confirmed')}>
                                Confirm
                              </Button>
                              <Button variant="outline" size="sm" disabled={updatingId === booking.id} onClick={() => handleStatusUpdate(booking.id, 'cancelled')}>
                                <XCircle className="size-3.5" />
                              </Button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <Button variant="outline" size="sm" disabled={updatingId === booking.id} onClick={() => handleStatusUpdate(booking.id, 'in_progress')}>
                              Start
                            </Button>
                          )}
                          {booking.status === 'in_progress' && (
                            <Button variant="outline" size="sm" disabled={updatingId === booking.id} onClick={() => handleStatusUpdate(booking.id, 'completed')}>
                              Complete
                            </Button>
                          )}
                          {(booking.status === 'completed' || booking.status === 'cancelled') && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {currentRole === 'admin' && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                            <Button variant="ghost" size="sm" className="text-[#2563EB] hover:text-[#2563EB]/80" onClick={() => openAssign(booking)}>
                              <UserCheck className="size-3.5 mr-1" /> Assign
                            </Button>
                          )}
                          {currentRole === 'admin' && (
                            <>
                              <a href={emailHref(booking)} target="_blank" rel="noreferrer">
                                <Button variant="ghost" size="sm" className="text-[#16A34A] hover:text-[#16A34A]/80">
                                  <Mail className="size-3.5 mr-1" /> Email
                                </Button>
                              </a>
                              <a href={whatsappHref(booking)} target="_blank" rel="noreferrer">
                                <Button variant="ghost" size="sm" className="text-[#25D366] hover:text-[#25D366]/80">
                                  <MessageCircle className="size-3.5 mr-1" /> WhatsApp
                                </Button>
                              </a>
                            </>
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

      {/* Assign Specialist Dialog */}
      {assignOpen && assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setAssignOpen(false); setAssignTarget(null); }} />
          <div className="relative bg-card rounded-lg border border-border shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] flex flex-col z-10">
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold">Assign Specialist</h2>
                <p className="text-sm text-muted-foreground">Booking: {assignTarget.ticketNumber}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setAssignOpen(false); setAssignTarget(null); }}><X className="size-4" /></Button>
            </div>

            {assignTarget.assignedSpecialist && (
              <div className="rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/5 p-3 text-sm shrink-0">
                <span className="text-muted-foreground">Currently assigned:</span>{' '}
                <span className="font-medium">{assignTarget.assignedSpecialist.name}</span>
                <span className="text-muted-foreground"> ({assignTarget.assignedSpecialist.specialty})</span>
              </div>
            )}

            <div className="relative shrink-0">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input placeholder="Search specialists..." value={specialistSearch} onChange={(e) => setSpecialistSearch(e.target.value)} className="pl-10" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {filteredSpecialists.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {specialists.length === 0 ? 'No specialists available. Add specialists first.' : 'No specialists match the search.'}
                </div>
              ) : (
                filteredSpecialists.map((s) => (
                  <div key={s.id} className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${assignTarget.assignedSpecialist?.id === s.id ? 'border-[#2563EB] bg-[#2563EB]/5' : 'border-border hover:bg-muted/30'}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.specialty} &middot; {s.email}</p>
                    </div>
                    <Button
                      variant={assignTarget.assignedSpecialist?.id === s.id ? 'default' : 'outline'}
                      size="sm"
                      disabled={assignLoading || assignTarget.assignedSpecialist?.id === s.id}
                      onClick={() => handleAssign(s.id)}
                      className="shrink-0 ml-3"
                    >
                      {assignTarget.assignedSpecialist?.id === s.id ? 'Assigned' : 'Assign'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
