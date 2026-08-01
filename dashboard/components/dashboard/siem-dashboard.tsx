'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield,
  AlertTriangle,
  Clock,
  Users,
  Upload,
  FileText,
  RefreshCw,
  Globe,
  KeyRound,
  ArrowLeft,
  FileDown,
} from 'lucide-react';
import { generatePDFReport } from '@/lib/pdf-utils';
import { getRoleFromCookie } from '@/lib/permissions';
import { logExport } from '@/lib/export-logger';
import Link from 'next/link';

interface SIEMStatus {
  connected: boolean;
  status: string;
  uptime: number;
  dataSources: string[];
  lastSync: string | null;
}

interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'info';
  timestamp: string;
  source: string;
}

interface SIEMEvent {
  id: string;
  timestamp: string;
  type: string;
  category: string;
  severity: string;
  action: string;
  user: string;
  ipAddress: string;
  description: string;
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

const severityDot: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  info: 'bg-blue-400',
};

const categoryBadge: Record<string, string> = {
  audit: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  auth: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  failed_login: 'bg-red-500/10 text-red-500 border-red-500/20',
  successful_login: 'bg-green-500/10 text-green-500 border-green-500/20',
};

function formatUptime(seconds: number): string {
  if (!seconds) return '0h';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SIEMDashboard() {
  const [status, setStatus] = useState<SIEMStatus | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [events, setEvents] = useState<SIEMEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('24');
  const [refreshing, setRefreshing] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const fetchAll = async (hours = timeRange, type = eventFilter) => {
    setRefreshing(true);
    try {
      const [statusRes, alertsRes, eventsRes] = await Promise.all([
        fetch('/api/siem/status'),
        fetch('/api/siem/alerts'),
        fetch(`/api/siem/events?hours=${hours}&limit=50${type !== 'all' ? `&type=${type}` : ''}`),
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts ?? data);
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events ?? data);
      }
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    getRoleFromCookie().then(setCurrentRole);
  }, []);

  useEffect(() => {
    fetchAll(timeRange, eventFilter);
  }, [timeRange, eventFilter]);

  const stats = useMemo(() => {
    const failedLogins24 = events.filter(
      (e) => e.type === 'failed_login' && new Date(e.timestamp).getTime() > Date.now() - 86400000
    ).length;
    const failedLogins1h = events.filter(
      (e) => e.type === 'failed_login' && new Date(e.timestamp).getTime() > Date.now() - 3600000
    ).length;
    const evidenceUploads = events.filter(
      (e) => e.action === 'evidence_upload' && new Date(e.timestamp).getTime() > Date.now() - 86400000
    ).length;
    const totalAudit = events.filter(
      (e) => new Date(e.timestamp).getTime() > Date.now() - 86400000
    ).length;
    const activeUsers = new Set(events.map((e) => e.user)).size;
    return { failedLogins24, failedLogins1h, evidenceUploads, totalAudit, activeUsers };
  }, [events]);

  const ipActivity = useMemo(() => {
    const map = new Map<string, number>();
    events
      .filter((e) => e.type === 'failed_login')
      .forEach((e) => map.set(e.ipAddress, (map.get(e.ipAddress) || 0) + 1));
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [events]);

  const handleExportPdf = () => {
    const isAdmin = currentRole === 'admin';
    const pdfColumns = [
      { header: 'Timestamp', key: 'timestamp', width: 40 },
      { header: 'Type', key: 'type', width: 30 },
      { header: 'Severity', key: 'severity', width: 25 },
      { header: 'Action', key: 'action', width: 45 },
      ...(isAdmin ? [{ header: 'User', key: 'user', width: 35 }, { header: 'IP Address', key: 'ipAddress', width: 35 }] : []),
    ];
    generatePDFReport({
      title: 'SIEM DASHBOARD REPORT',
      subtitle: `Security events overview — ${events.length} events exported`,
      columns: pdfColumns,
      rows: events.map((event) => ({
        timestamp: new Date(event.timestamp).toLocaleString(),
        type: event.type,
        severity: event.severity,
        action: event.action.replace(/_/g, ' '),
        ...(isAdmin ? { user: event.user, ipAddress: event.ipAddress } : {}),
      })),
      fileName: 'siem-dashboard-report',
      summary: [
        { label: 'Total Events', value: events.length },
        { label: 'Active Alerts', value: alerts.length },
        { label: 'Connection', value: status?.connected ? 'Connected' : 'Disconnected' },
      ],
    });
    logExport('siem', 'pdf', events.length);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">SIEM Dashboard</h1>
          <p className="text-muted-foreground mt-1">Loading security event data...</p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          Loading SIEM data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">SIEM Dashboard</h1>
            <p className="text-muted-foreground mt-1">Security Information and Event Management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchAll()} disabled={refreshing}>
            <RefreshCw className={`mr-2 size-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="mr-2 size-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Connection Status Header */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full ${
                  status?.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <div>
                <p className="font-medium">
                  {status?.connected ? 'Connected' : 'Disconnected'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: {status?.status ?? 'unknown'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Uptime</p>
                <p className="font-semibold">{formatUptime(status?.uptime ?? 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Data Sources</p>
                <p className="font-semibold">{status?.dataSources?.length ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Sync</p>
                <p className="font-semibold">
                  {status?.lastSync ? timeAgo(status.lastSync) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Failed Logins (24h)', value: stats.failedLogins24, icon: KeyRound, color: 'text-red-500' },
          { label: 'Failed Logins (1h)', value: stats.failedLogins1h, icon: AlertTriangle, color: 'text-orange-500' },
          { label: 'Active Cases', value: alerts.length, icon: FileText, color: 'text-primary' },
          { label: 'Evidence Uploads (24h)', value: stats.evidenceUploads, icon: Upload, color: 'text-blue-500' },
          { label: 'Total Events (24h)', value: stats.totalAudit, icon: Clock, color: 'text-slate-300' },
          { label: 'Active Users', value: stats.activeUsers, icon: Users, color: 'text-[#2DD4BF]' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className={`size-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Security Alerts Panel */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Security Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No active alerts.</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    severityColors[alert.severity] ?? severityColors.info
                  }`}
                >
                  <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`size-2 rounded-full ${
                            severityDot[alert.severity] ?? severityDot.info
                          }`}
                        />
                        <p className="font-semibold">{alert.title}</p>
                      </div>
                      <p className="text-sm opacity-80">{alert.description}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-2 md:mt-0 shrink-0">
                      <Badge variant="outline" className={severityColors[alert.severity] ?? severityColors.info}>
                        {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo(alert.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Event Timeline */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5" />
                Event Timeline
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="flex rounded-md border border-border overflow-hidden">
                  {['all', 'audit', 'auth', 'failed_login', 'successful_login'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setEventFilter(f)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        eventFilter === f
                          ? 'bg-primary text-white'
                          : 'bg-background/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'failed_login' ? 'Failed' : f === 'successful_login' ? 'Success' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex rounded-md border border-border overflow-hidden">
                  {[
                    { label: '1h', value: '1' },
                    { label: '6h', value: '6' },
                    { label: '24h', value: '24' },
                    { label: '7d', value: '168' },
                  ].map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTimeRange(t.value)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        timeRange === t.value
                          ? 'bg-primary text-white'
                          : 'bg-background/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No events in selected range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold">Time</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Category</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Severity</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Action</th>
                      {currentRole === 'admin' && <th className="px-3 py-2.5 text-left font-semibold">User</th>}
                      {currentRole === 'admin' && <th className="px-3 py-2.5 text-left font-semibold">IP Address</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => {
                      const rowColor =
                        event.type === 'failed_login'
                          ? 'border-l-2 border-l-red-500'
                          : event.action === 'evidence_upload'
                          ? 'border-l-2 border-l-blue-500'
                          : event.type === 'audit'
                          ? 'border-l-2 border-l-amber-500'
                          : '';
                      return (
                        <tr
                          key={event.id}
                          className={`border-b border-border hover:bg-muted/50 transition-colors ${rowColor}`}
                        >
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge variant="outline" className={categoryBadge[event.type] ?? 'bg-slate-500/10 text-slate-300'}>
                              {event.type === 'failed_login'
                                ? 'Failed'
                                : event.type === 'successful_login'
                                ? 'Success'
                                : event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div
                                className={`size-2 rounded-full ${
                                  severityDot[event.severity] ?? 'bg-slate-400'
                                }`}
                              />
                              <span className="text-xs capitalize">{event.severity}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs">{event.action.replace(/_/g, ' ')}</td>
                          {currentRole === 'admin' && <td className="px-3 py-2.5 text-xs text-muted-foreground">{event.user}</td>}
                          {currentRole === 'admin' && (
                            <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">
                              {event.ipAddress}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* IP Activity Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-5" />
              IP Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ipActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No IP activity data.</p>
            ) : (
              <div className="space-y-2">
                {ipActivity.map(([ip, count]) => (
                  <div
                    key={ip}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/40"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-red-500" />
                      <span className="text-sm font-mono">{ip}</span>
                    </div>
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                      {count} {count === 1 ? 'attempt' : 'attempts'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
