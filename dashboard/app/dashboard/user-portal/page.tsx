'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Inbox,
  LayoutDashboard,
  Lock,
  MailCheck,
  MessageSquare,
  PhoneCall,
  Swords,
  UserCheck,
} from 'lucide-react';
import { getRoleFromCookie } from '@/lib/permissions';

const statusColors: Record<string, string> = {
  open: 'bg-red-500/10 text-red-500 border-red-500/20',
  investigating: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  pending: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  pending_evidence: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
  closed: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  new: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
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

interface MyCase {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: string;
  assignedTo?: string | null;
  updatedAt: string;
  responses?: CaseResponse[];
  source: 'report' | 'case';
}

interface PortalNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  createdAt: string;
  read: boolean;
}

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  category: string;
  imageUrl: string | null;
  price: string;
}

interface ApiCaseResponse {
  id: number;
  text: string;
  createdAt: string;
  author: { id: number; fullName: string; role: string } | null;
}

interface ApiCaseLite {
  id: number;
  status: string;
  createdAt: string;
  assignedInvestigator: { id: number; fullName: string } | null;
  responses: ApiCaseResponse[];
}

interface ApiReport {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  incidentType: string;
  priority: string;
  status: string;
  createdAt: string;
  submittedAt: string;
  cases: ApiCaseLite[];
}

interface ApiCase {
  id: number;
  reportId: number;
  status: string;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  assignedInvestigator: { id: number; fullName: string } | null;
  report: { id: number; ticketNumber: string; title: string; incidentType: string; createdAt: string } | null;
  responses: ApiCaseResponse[];
}

interface ApiNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

function formatDate(value?: string): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function UserPortalPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string; email: string; createdAt: string }>({ name: '', email: '', createdAt: '' });
  const [reports, setReports] = useState<MyReport[]>([]);
  const [cases, setCases] = useState<MyCase[]>([]);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      const r = await getRoleFromCookie();
      setRole(r);
      if (r === null) {
        router.replace('/login');
        return;
      }
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
          setUser({
            name: data?.data?.fullName ?? data?.fullName ?? data?.data?.name ?? '',
            email: data?.data?.email ?? data?.email ?? '',
            createdAt: data?.data?.createdAt ?? data?.createdAt ?? '',
          });
        }
      } catch {
        // silently fail
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (role === null) return;

    const fetchAll = async () => {
      setLoading(true);
      setError('');

      const [reportsRes, casesRes, notifRes, coursesRes] = await Promise.all([
        fetch('/api/reports/my').catch(() => null),
        fetch('/api/cases/my').catch(() => null),
        fetch('/api/notifications').catch(() => null),
        fetch('/api/catalog/courses').catch(() => null),
      ]);

      try {
        if (reportsRes?.ok) {
          const payload = await reportsRes.json();
          const list = (Array.isArray(payload) ? payload : payload?.reports ?? []) as ApiReport[];
          setReports(
            list.map((item) => ({
              id: String(item.id),
              ticketNumber: item.ticketNumber,
              title: item.title,
              description: item.description,
              incidentType: item.incidentType,
              status: item.status,
              severity: item.priority,
              assignedVolunteerName: item.cases?.[0]?.assignedInvestigator?.fullName ?? null,
              submittedDate: item.submittedAt ?? item.createdAt,
              responses: (item.cases?.[0]?.responses ?? []).map((r) => ({
                id: String(r.id),
                authorName: r.author?.fullName ?? 'System',
                authorRole: r.author?.role ?? 'admin',
                text: r.text,
                createdAt: r.createdAt,
              })),
            })),
          );
        }

        if (casesRes?.ok) {
          const payload = await casesRes.json();
          const list = (Array.isArray(payload) ? payload : payload?.cases ?? []) as ApiCase[];
          setCases(
            list.map((item) => ({
              id: String(item.id),
              caseNumber: item.report?.ticketNumber ?? `#${item.id}`,
              title: item.report?.title ?? 'Case',
              description: item.resolutionNotes ?? '',
              status: item.status,
              assignedTo: item.assignedInvestigator?.fullName ?? null,
              updatedAt: item.updatedAt ?? item.createdAt,
              responses: (item.responses ?? []).map((r) => ({
                id: String(r.id),
                authorName: r.author?.fullName ?? 'System',
                authorRole: r.author?.role ?? 'admin',
                text: r.text,
                createdAt: r.createdAt,
              })),
              source: 'case',
            })),
          );
        }

        if (notifRes?.ok) {
          const payload = await notifRes.json();
          const list = (Array.isArray(payload) ? payload : payload?.notifications ?? []) as ApiNotification[];
          setNotifications(
            list
              .map((n) => ({
                id: String(n.id),
                type: n.type,
                title: n.title,
                message: n.body,
                priority: 'normal',
                createdAt: n.createdAt,
                read: n.isRead,
              }))
              .sort((a: PortalNotification, b: PortalNotification) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
          );
        }

        if (coursesRes?.ok) {
          const payload = await coursesRes.json();
          const list = payload?.courses ?? payload?.items ?? [];
          setCourses(list.slice(0, 3));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load your dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [role]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const inProgressCount =
    reports.filter((r) => ['investigating', 'pending', 'pending_evidence'].includes(r.status)).length +
    cases.filter((c) => ['investigating', 'pending', 'pending_evidence'].includes(c.status)).length;
  const resolvedCount =
    reports.filter((r) => ['resolved', 'closed'].includes(r.status)).length +
    cases.filter((c) => ['resolved', 'closed'].includes(c.status)).length;

  if (role === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#2563EB]/10 ring-1 ring-[#2563EB]/20">
              <LayoutDashboard className="size-5 text-[#2563EB]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome{user.name ? `, ${user.name.split(' ')[0]}` : ''}
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Your YCKF account dashboard — reports, cases, notifications &amp; learning.
              </p>
            </div>
          </div>
          {user.email && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-foreground/80">
                {user.email}
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                <MailCheck className="mr-1 size-3" />
                Verified Member
              </Badge>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild className="bg-gradient-to-r from-[#2563EB] to-[#3B82F6] font-medium shadow-lg shadow-[#2563EB]/25">
            <Link href="/report-a-cybercrime">
              <Swords className="mr-2 size-4" />
              Report an Incident
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                <p className="text-sm text-muted-foreground">Active Cases</p>
                <p className="mt-2 text-2xl font-semibold">{cases.length}</p>
              </div>
              <div className="rounded-lg bg-violet-500/10 p-2">
                <AlertTriangle className="size-5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="mt-2 text-2xl font-semibold">{inProgressCount}</p>
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
                <p className="mt-2 text-2xl font-semibold">{resolvedCount}</p>
              </div>
              <div className="rounded-lg bg-green-500/10 p-2">
                <CheckCircle2 className="size-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Reports & Cases */}
          <div>
            <h2 className="text-xl font-bold mb-4">My Reports &amp; Cases</h2>

            {loading ? (
              <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
                Loading your activity...
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-10 text-center text-destructive">
                {error}
              </div>
            ) : reports.length === 0 && cases.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Inbox className="size-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">Nothing here yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You have not submitted any reports or opened any cases.
                    </p>
                    <Button asChild className="mt-5 bg-[#2563EB] text-white hover:bg-[#2563EB]/90">
                      <Link href="/report-a-cybercrime">Report your first incident</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Card key={`report-${report.id}`} className="glass-card overflow-hidden">
                    <button
                      onClick={() => toggleExpand(`report-${report.id}`)}
                      className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1.5">
                            <Badge variant="outline" className={statusColors[report.status] ?? statusColors.open}>
                              {report.status.replace('_', ' ').charAt(0).toUpperCase() + report.status.replace('_', ' ').slice(1)}
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
                              {formatDate(report.submittedDate)}
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
                          {expandedId === `report-${report.id}` ? (
                            <ChevronUp className="size-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="size-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedId === `report-${report.id}` && (
                      <div className="border-t border-border p-4 space-y-4 bg-muted/10">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Description</p>
                          <p className="text-sm leading-relaxed">{report.description}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Severity</p>
                            <Badge
                              variant="outline"
                              className={
                                report.severity === 'critical'
                                  ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                  : report.severity === 'high'
                                  ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                  : report.severity === 'medium'
                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                  : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              }
                            >
                              {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Assigned To</p>
                            <p className="text-sm font-medium">{report.assignedVolunteerName ?? 'Unassigned'}</p>
                          </div>
                        </div>

                        {report.responses && report.responses.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                              Responses
                            </p>
                            {report.responses.map((resp) => (
                              <div key={resp.id} className="rounded-lg border border-border bg-card/60 p-3 space-y-1">
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

                {cases.map((item) => (
                  <Card key={`case-${item.id}`} className="glass-card overflow-hidden">
                    <button
                      onClick={() => toggleExpand(`case-${item.id}`)}
                      className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1.5">
                            <Badge variant="outline" className={statusColors[item.status] ?? statusColors.open}>
                              {item.status.replace('_', ' ').charAt(0).toUpperCase() + item.status.replace('_', ' ').slice(1)}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">{item.caseNumber}</span>
                          </div>
                          <h3 className="font-medium truncate">{item.title}</h3>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <UserCheck className="size-3" />
                              {item.assignedTo ?? 'Unassigned'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              Updated {formatDate(item.updatedAt)}
                            </span>
                            {item.responses && item.responses.length > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="size-3" />
                                {item.responses.length} response{item.responses.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 mt-1">
                          {expandedId === `case-${item.id}` ? (
                            <ChevronUp className="size-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="size-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedId === `case-${item.id}` && (
                      <div className="border-t border-border p-4 space-y-4 bg-muted/10">
                        {item.description && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Summary</p>
                            <p className="text-sm leading-relaxed">{item.description}</p>
                          </div>
                        )}
                        {item.responses && item.responses.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                              Progress Updates
                            </p>
                            {item.responses.map((resp) => (
                              <div key={resp.id} className="rounded-lg border border-border bg-card/60 p-3 space-y-1">
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
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Available courses */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Available Courses</h2>
              <Link href="/courses" className="text-sm font-medium text-[#2563EB] hover:text-[#2563EB]/80">
                Browse all courses
              </Link>
            </div>
            {courses.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {courses.map((course) => (
                  <Card key={course.id} className="glass-card overflow-hidden">
                    {course.imageUrl && (
                      <div className="h-32 overflow-hidden bg-background/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={course.imageUrl} alt={course.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-5 space-y-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-4 text-[#2563EB]" />
                        <h3 className="font-semibold line-clamp-1">{course.title}</h3>
                      </div>
                      {course.level && <p className="text-xs text-primary">{course.level}</p>}
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                        {course.duration && <span className="flex items-center gap-1"><Clock className="size-3" />{course.duration}</span>}
                        <Button asChild size="sm" variant="outline" className="text-xs">
                          <Link href={`/courses${course.slug ? `#${course.slug}` : ''}`}>View</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <BookOpen className="size-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No courses available right now. Check back soon.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Notifications */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <Bell className="size-4 text-[#2563EB]" />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge className="bg-[#2563EB] text-white">{unreadCount} new</Badge>
                  )}
                </h2>
              </div>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Bell className="size-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-lg border p-3 space-y-1 ${
                        n.read
                          ? 'border-border bg-card/40'
                          : 'border-[#2563EB]/30 bg-[#2563EB]/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium line-clamp-1">{n.title}</span>
                        {!n.read && <span className="size-2 shrink-0 rounded-full bg-[#2563EB]" />}
                      </div>
                      {n.message && <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>}
                      <p className="text-[11px] text-muted-foreground/70">
                        {formatDate(n.createdAt)} ·{' '}
                        {n.priority === 'high' || n.priority === 'urgent' ? 'High priority' : 'Normal'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/report-a-cybercrime">
                    <Swords className="mr-2 size-4 text-[#2563EB]" />
                    Report an Incident
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/courses">
                    <BookOpen className="mr-2 size-4 text-[#2563EB]" />
                    Browse Courses
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/book">
                    <PhoneCall className="mr-2 size-4 text-[#2563EB]" />
                    Book a Specialist
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/news">
                    <FileText className="mr-2 size-4 text-[#2563EB]" />
                    Latest News &amp; Updates
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account info */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold mb-4">Account</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="font-medium">{formatDate(user.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Lock className="size-3" /> Account type
                  </span>
                  <Badge variant="outline">Member</Badge>
                </div>
                <p className="pt-2 text-xs text-muted-foreground">
                  Need help? Email{' '}
                  <a href="mailto:support@youngcyberknightsfoundation.org" className="text-[#2563EB]">
                    support@youngcyberknightsfoundation.org
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
