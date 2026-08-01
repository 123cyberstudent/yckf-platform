'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Mail, Phone, MapPin, Clock, Send, UserPlus, CheckCircle } from 'lucide-react';
import { getRoleFromCookie } from '@/lib/permissions';

interface ReportResponse {
  id: number;
  responseText: string;
  createdAt: string;
  author: { id: number; fullName: string; role: string };
}

interface ReportDetail {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  incidentType: string;
  priority: string;
  status: string;
  location: string;
  reporterName: string | null;
  reporterEmail: string | null;
  reporterPhone: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsAddress: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  cases: {
    id: number;
    status: string;
    assignedInvestigatorId: number | null;
    assignedInvestigator: { id: number; fullName: string; email: string } | null;
    responses: ReportResponse[];
  }[];
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  under_review: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  in_progress: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  accepted: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  assigned: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
  closed: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const statusOptions = ['new', 'under_review', 'in_progress', 'resolved', 'closed', 'rejected'];

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responding, setResponding] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [volunteers, setVolunteers] = useState<{ id: number; fullName: string }[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState<number | ''>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    getRoleFromCookie().then(setRole);
  }, []);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/reports/${params.id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setReport(data);
      } catch {
        setReport(null);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [params.id]);

  useEffect(() => {
    if (role === 'admin' || role === 'super_admin') {
      fetch('/api/users?role=VOLUNTEER')
        .then(r => r.json())
        .then(d => setVolunteers(d.users ?? []))
        .catch(() => {});
    }
  }, [role]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAccept = async () => {
    if (!report) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/accept`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      showToast('success', 'Case accepted successfully');
      const updated = await fetch(`/api/reports/${params.id}`).then(r => r.json());
      setReport(updated);
    } catch {
      showToast('error', 'Failed to accept case');
    } finally {
      setAccepting(false);
    }
  };

  const handleRespond = async () => {
    if (!report || !responseText.trim()) return;
    setResponding(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText: responseText.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setResponseText('');
      showToast('success', 'Response sent to complainant');
      const updated = await fetch(`/api/reports/${params.id}`).then(r => r.json());
      setReport(updated);
    } catch {
      showToast('error', 'Failed to send response');
    } finally {
      setResponding(false);
    }
  };

  const handleAssign = async () => {
    if (!report || !selectedVolunteer) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volunteerId: selectedVolunteer }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', 'Case assigned to volunteer');
      const updated = await fetch(`/api/reports/${params.id}`).then(r => r.json());
      setReport(updated);
    } catch {
      showToast('error', 'Failed to assign case');
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!report) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/reports/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', 'Status updated');
      const updated = await fetch(`/api/reports/${params.id}`).then(r => r.json());
      setReport(updated);
    } catch {
      showToast('error', 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const parsedDescription = useMemo(() => {
    if (!report) return null;
    try {
      const parsed = JSON.parse(report.description);
      return parsed;
    } catch {
      return { description: report.description };
    }
  }, [report]);

  const caseRecord = report?.cases?.[0];
  const isAssigned = !!caseRecord?.assignedInvestigatorId;
  const canAccept = role && (role === 'super_admin' || role === 'admin' || role === 'volunteer' || role === 'investigator');
  const canRespond = role && (role === 'super_admin' || role === 'admin' || role === 'volunteer' || role === 'investigator');
  const canAssign = role === 'super_admin' || role === 'admin';

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading case details...</div>;
  }

  if (!report) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Report not found.</div>;
  }

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-white text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <button onClick={() => router.push('/dashboard/incidents')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-4" />
        Back to Incidents
      </button>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{report.title}</h1>
          {parsedDescription?.description && (
            <p className="mt-1 text-muted-foreground max-w-2xl">{parsedDescription.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={statusColors[report.status] || statusColors.new}>
            Status: {report.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
            {report.ticketNumber}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        {/* Left: Details + Responses */}
        <div className="space-y-6">
          {/* Report Details */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Reporter:</span>
                  <span className="font-medium">{report.reporterName || parsedDescription?.fullName || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{report.reporterEmail || parsedDescription?.email || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{report.reporterPhone || parsedDescription?.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Incident Type:</span>
                  <span className="ml-2 font-medium">{report.incidentType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">{report.gpsAddress || report.location || parsedDescription?.location || 'Not provided'}</span>
                </div>
                {report.gpsLatitude && report.gpsLongitude && (
                  <div>
                    <span className="text-muted-foreground">GPS:</span>
                    <span className="ml-2 font-medium">{report.gpsLatitude.toFixed(4)}, {report.gpsLongitude.toFixed(4)}</span>
                  </div>
                )}
              </div>
              <div className="h-px bg-gradient-to-r from-gray-200 via-gray-100 to-transparent" />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Description</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {parsedDescription?.description || report.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Investigation Notes */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Investigation Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {caseRecord?.responses && caseRecord.responses.length > 0 ? (
                <div className="space-y-3">
                  {caseRecord.responses.map((resp) => (
                    <div key={resp.id} className="rounded-lg border border-border bg-background/40 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{resp.author.fullName}</p>
                        <Badge variant="outline" className="text-xs">
                          {resp.author.role}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(resp.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-2 text-sm whitespace-pre-wrap">{resp.responseText}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No responses yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Respond to Complainant */}
          {canRespond && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="size-4" />
                  Respond to Complainant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 focus:border-[#2563EB] min-h-[100px] resize-y"
                  placeholder="Type your response to the complainant..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This response will be emailed to {report.reporterEmail || 'the complainant'}.
                </p>
                <Button
                  className="mt-3 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white"
                  onClick={handleRespond}
                  disabled={responding || !responseText.trim()}
                >
                  <Send className="size-4 mr-2" />
                  {responding ? 'Sending...' : 'Send Response'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* Case Status */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Case Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Assigned to:</span>
                <span className="ml-2 font-medium">
                  {caseRecord?.assignedInvestigator?.fullName || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Case status:</span>
                <Badge variant="outline" className={`ml-2 ${statusColors[caseRecord?.status || report.status] || ''}`}>
                  {(caseRecord?.status || report.status).replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">{new Date(report.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Updated:</span>
                <span className="font-medium">{new Date(report.updatedAt).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Accept Case */}
          {canAccept && !isAssigned && (
            <Card className="glass-card">
              <CardContent className="pt-6">
                <Button
                  className="w-full bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 text-[#06292D] font-semibold"
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  <CheckCircle className="size-4 mr-2" />
                  {accepting ? 'Accepting...' : 'Accept This Case'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Admin: Assign to Volunteer */}
          {canAssign && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="size-4" />
                  Assign Case
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50"
                  value={selectedVolunteer}
                  onChange={(e) => setSelectedVolunteer(Number(e.target.value))}
                >
                  <option value="">Select volunteer...</option>
                  {volunteers.map(v => (
                    <option key={v.id} value={v.id}>{v.fullName}</option>
                  ))}
                </select>
                <Button
                  className="w-full bg-[#06292D] hover:bg-[#06292D]/90 text-white"
                  onClick={handleAssign}
                  disabled={assigning || !selectedVolunteer}
                >
                  <UserPlus className="size-4 mr-2" />
                  {assigning ? 'Assigning...' : 'Assign to Volunteer'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Admin: Update Status */}
          {canAssign && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50"
                  value={report.status}
                  onChange={(e) => handleStatusUpdate(e.target.value)}
                  disabled={updatingStatus}
                >
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
