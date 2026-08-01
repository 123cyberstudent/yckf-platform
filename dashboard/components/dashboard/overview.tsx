'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckCircle, Clock, Users, Shield, Activity, Smartphone, Globe, FileDown } from 'lucide-react';
import { generatePlatformActivityReport } from '@/lib/platform-report';
import { logExport } from '@/lib/export-logger';
import { getRoleFromCookie } from '@/lib/permissions';

interface DashboardStats {
  totalUsers: number;
  mobileUsers: number;
  webUsers: number;
  activeCases: number;
  pendingCases: number;
  resolvedCases: number;
  criticalIncidents: number;
  activeInvestigators: number;
  activeVolunteers: number;
  avgResponseTime: string;
  casesThisMonth: number;
}

interface TrendEntry {
  name: string;
  incidents: number;
  resolved: number;
}

interface CategoryEntry {
  name: string;
  value: number;
}

interface SeverityEntry {
  name: string;
  value: number;
}

interface StatusEntry {
  name: string;
  value: number;
}

interface AnalyticsData {
  trendData: TrendEntry[];
  categoryData: CategoryEntry[];
  severityData: SeverityEntry[];
  statusData: StatusEntry[];
}

const SEVERITY_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981'];
const STATUS_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#6B7280'];

const EmptyChartPlaceholder = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-[250px] text-[#6B7280] text-sm">
    {message}
  </div>
);

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
  color: '#111827',
};

function useFormattedDateTime() {
  const [now, setNow] = useState<string>('');
  useEffect(() => {
    const update = () => {
      setNow(
        new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const dateTime = useFormattedDateTime();

  const handleDownloadReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch('/api/platform-report');
      if (!res.ok) throw new Error('Failed to fetch report data');
      const data = await res.json();
      generatePlatformActivityReport(data);
      logExport('platform-report', 'pdf', 1, 'admin-download');
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    getRoleFromCookie().then(setRole);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/analytics'),
        ]);

        if (!statsRes.ok) {
          throw new Error(`Failed to load dashboard stats: ${statsRes.status}`);
        }

        const statsData = await statsRes.json();
        setStats(statsData);

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        } else {
          setAnalytics(null);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return <div className="text-center text-[#6B7280] py-12">{error || 'Failed to load dashboard data'}</div>;
  }

  const trendData = analytics?.trendData ?? [];
  const categoryData = analytics?.categoryData ?? [];
  const severityData = analytics?.severityData ?? [];
  const statusData = analytics?.statusData ?? [];

  const maxIncidents = Math.max(...trendData.map((d) => d.incidents), 1);
  const maxSeverity = Math.max(...severityData.map((d) => d.value), 1);

  const statCards = [
    {
      icon: Users,
      label: 'Total Users',
      value: stats.totalUsers,
      borderColor: 'border-l-[#2563EB]',
      iconBg: 'bg-[#2563EB]/10',
      iconColor: 'text-[#2563EB]',
      gradientFrom: 'from-blue-50/60',
    },
    {
      icon: AlertTriangle,
      label: 'Active Cases',
      value: stats.activeCases,
      borderColor: 'border-l-[#2DD4BF]',
      iconBg: 'bg-[#2DD4BF]/10',
      iconColor: 'text-[#2DD4BF]',
      gradientFrom: 'from-teal-50/60',
    },
    {
      icon: Clock,
      label: 'Pending Cases',
      value: stats.pendingCases,
      borderColor: 'border-l-[#F59E0B]',
      iconBg: 'bg-[#F59E0B]/10',
      iconColor: 'text-[#F59E0B]',
      gradientFrom: 'from-amber-50/60',
    },
    {
      icon: CheckCircle,
      label: 'Resolved Cases',
      value: stats.resolvedCases,
      borderColor: 'border-l-[#10B981]',
      iconBg: 'bg-[#10B981]/10',
      iconColor: 'text-[#10B981]',
      gradientFrom: 'from-emerald-50/60',
    },
  ];

  return (
    <>
    <style>{`
      @keyframes overviewFadeIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .overview-fade-in { animation: overviewFadeIn 0.5s ease-out both; }
      .stat-card-hover {
        transition: box-shadow 0.2s ease, transform 0.2s ease;
      }
      .stat-card-hover:hover {
        box-shadow: 0 8px 25px -5px rgba(0,0,0,0.1), 0 4px 10px -6px rgba(0,0,0,0.08);
        transform: translateY(-2px);
      }
      @keyframes dotPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.35); opacity: 0.7; }
      }
    `}</style>

    <div className="space-y-8 overview-fade-in">
      {/* ── Welcome Banner ───────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl px-8 py-8"
        style={{
          background: 'linear-gradient(135deg, #06292D 0%, #0D3D42 40%, #115E63 100%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, #2563EB 0%, transparent 50%), radial-gradient(circle at 80% 20%, #2DD4BF 0%, transparent 40%)',
          }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome back, Admin
            </h1>
            <p className="mt-1 text-sm text-teal-200/80 font-medium tracking-wide">
              Empowering a Safer Digital World
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-teal-300/60 uppercase tracking-widest font-semibold">
              {dateTime}
            </p>
            {(role === 'admin' || role === 'super_admin') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadReport}
                disabled={reportLoading}
                className="mt-2 bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
              >
                <FileDown className="mr-1.5 size-3.5" />
                {reportLoading ? 'Generating...' : 'Download Platform Report'}
              </Button>
            )}
          </div>
        </div>
        <div
          className="absolute -bottom-8 -right-8 opacity-[0.06]"
          style={{ width: 200, height: 200 }}
        >
          <Shield className="w-full h-full text-white" strokeWidth={0.8} />
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`stat-card-hover relative overflow-hidden rounded-xl border border-gray-200 border-l-4 ${stat.borderColor} bg-white cursor-default`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.gradientFrom} to-transparent pointer-events-none`}
              />
              <div className="relative p-6 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[#6B7280]">{stat.label}</p>
                  <p className="text-4xl font-extrabold text-[#111827] mt-2 tabular-nums">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.iconBg} p-3 rounded-2xl`}>
                  <Icon className={`size-5 ${stat.iconColor}`} strokeWidth={2.2} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Platform Breakdown ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <CardContent className="pt-5 pb-5 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6B7280]">Mobile App Users</p>
                <p className="text-3xl font-bold text-[#2563EB] mt-1">{stats.mobileUsers ?? 0}</p>
              </div>
              <div className="bg-[#2563EB]/10 p-3 rounded-2xl">
                <Smartphone className="size-5 text-[#2563EB]" strokeWidth={2.2} />
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] rounded-full transition-all"
                  style={{ width: `${stats.totalUsers > 0 ? ((stats.mobileUsers ?? 0) / stats.totalUsers) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-[#6B7280] mt-1">
                {stats.totalUsers > 0 ? Math.round(((stats.mobileUsers ?? 0) / stats.totalUsers) * 100) : 0}% of total users
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <CardContent className="pt-5 pb-5 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6B7280]">Website Users</p>
                <p className="text-3xl font-bold text-[#06292D] mt-1">{stats.webUsers ?? 0}</p>
              </div>
              <div className="bg-[#06292D]/10 p-3 rounded-2xl">
                <Globe className="size-5 text-[#06292D]" strokeWidth={2.2} />
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#06292D] rounded-full transition-all"
                  style={{ width: `${stats.totalUsers > 0 ? ((stats.webUsers ?? 0) / stats.totalUsers) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-[#6B7280] mt-1">
                {stats.totalUsers > 0 ? Math.round(((stats.webUsers ?? 0) / stats.totalUsers) * 100) : 0}% of total users
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <CardContent className="pt-5 pb-5 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6B7280]">Active Investigators</p>
                <p className="text-3xl font-bold text-[#2DD4BF] mt-1">{stats.activeInvestigators ?? 0}</p>
              </div>
              <div className="bg-[#2DD4BF]/10 p-3 rounded-2xl">
                <Shield className="size-5 text-[#2DD4BF]" strokeWidth={2.2} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Key Metrics ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <CardContent className="pt-6 pb-6 px-6">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-[#6B7280]">Avg Response Time</p>
                <p className="text-3xl font-bold text-[#111827] mt-1">{stats.avgResponseTime}</p>
              </div>
              <div className="h-px bg-gradient-to-r from-gray-200 via-gray-100 to-transparent" />
              <div>
                <p className="text-sm font-medium text-[#6B7280]">Critical Incidents</p>
                <p className="text-3xl font-bold text-[#EF4444] mt-1">{stats.criticalIncidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <CardContent className="pt-6 pb-6 px-6">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-[#6B7280]">Active Volunteers</p>
                <p className="text-3xl font-bold text-[#111827] mt-1">
                  {stats.activeVolunteers ?? stats.activeInvestigators}
                </p>
              </div>
              <div className="h-px bg-gradient-to-r from-gray-200 via-gray-100 to-transparent" />
              <div>
                <p className="text-sm font-medium text-[#6B7280]">Cases This Month</p>
                <p className="text-3xl font-bold text-[#111827] mt-1">{stats.casesThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 1 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Trends */}
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-0 pt-6 px-6">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-[#2563EB]" />
              <CardTitle className="text-lg font-semibold text-[#111827]">Incident Trends</CardTitle>
            </div>
            <CardDescription className="text-[#6B7280]">Last 6 months activity</CardDescription>
            <div className="h-px mt-4 bg-gradient-to-r from-gray-200 via-gray-100 to-transparent" />
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-4">
            {trendData.length === 0 ? (
              <EmptyChartPlaceholder message="No data available" />
            ) : (
              <div className="space-y-3">
                {trendData.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-lg border border-gray-200 bg-[#F8FAFC] p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#111827]">{item.name}</p>
                      <p className="text-sm text-[#6B7280]">Resolved: {item.resolved}</p>
                    </div>
                    <p className="text-2xl font-bold text-[#111827] mt-2">{item.incidents}</p>
                    <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                        style={{ width: `${Math.min((item.incidents / maxIncidents) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-0 pt-6 px-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[#F59E0B]" />
              <CardTitle className="text-lg font-semibold text-[#111827]">Severity Distribution</CardTitle>
            </div>
            <CardDescription className="text-[#6B7280]">Current incident breakdown</CardDescription>
            <div className="h-px mt-4 bg-gradient-to-r from-gray-200 via-gray-100 to-transparent" />
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-4">
            {severityData.length === 0 ? (
              <EmptyChartPlaceholder message="No data available" />
            ) : (
              <div className="space-y-3">
                {severityData.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-[#F8FAFC] p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{item.name}</p>
                      <p className="text-xl font-bold text-[#111827]">{item.value}</p>
                    </div>
                    <div className="h-3 w-32 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          backgroundColor: SEVERITY_COLORS[index % SEVERITY_COLORS.length],
                          width: `${(item.value / maxSeverity) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Category */}
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-0 pt-6 px-6">
            <CardTitle className="text-lg font-semibold text-[#111827]">Cases by Category</CardTitle>
            <CardDescription className="text-[#6B7280]">Distribution of incident types</CardDescription>
            <div className="h-px mt-4 bg-gradient-to-r from-gray-200 via-gray-100 to-transparent" />
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-4">
            {categoryData.length === 0 ? (
              <EmptyChartPlaceholder message="No data available" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={13} />
                  <YAxis stroke="#6B7280" fontSize={13} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cases by Status */}
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-0 pt-6 px-6">
            <CardTitle className="text-lg font-semibold text-[#111827]">Cases by Status</CardTitle>
            <CardDescription className="text-[#6B7280]">Breakdown by resolution status</CardDescription>
            <div className="h-px mt-4 bg-gradient-to-r from-gray-200 via-gray-100 to-transparent" />
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-4">
            {statusData.length === 0 ? (
              <EmptyChartPlaceholder message="No data available" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
