'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeCases: number;
  pendingCases: number;
  resolvedCases: number;
  criticalIncidents: number;
  activeInvestigators: number;
  avgResponseTime: string;
  casesThisMonth: number;
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) {
          throw new Error(`Failed to load dashboard stats: ${response.status}`);
        }
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
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

  if (!stats) {
    return <div className="text-center text-[#6B7280] py-12">Failed to load dashboard data</div>;
  }

  const statCards = [
    {
      icon: Users,
      label: 'Total Users',
      value: stats.totalUsers,
      borderColor: 'border-l-[#2563EB]',
      bgLight: 'bg-blue-50',
      iconBg: 'bg-[#2563EB]/10',
      iconColor: 'text-[#2563EB]',
    },
    {
      icon: AlertTriangle,
      label: 'Active Cases',
      value: stats.activeCases,
      borderColor: 'border-l-[#F59E0B]',
      bgLight: 'bg-amber-50',
      iconBg: 'bg-[#F59E0B]/10',
      iconColor: 'text-[#F59E0B]',
    },
    {
      icon: Clock,
      label: 'Pending Cases',
      value: stats.pendingCases,
      borderColor: 'border-l-[#F97316]',
      bgLight: 'bg-orange-50',
      iconBg: 'bg-[#F97316]/10',
      iconColor: 'text-[#F97316]',
    },
    {
      icon: CheckCircle,
      label: 'Resolved Cases',
      value: stats.resolvedCases,
      borderColor: 'border-l-[#10B981]',
      bgLight: 'bg-green-50',
      iconBg: 'bg-[#10B981]/10',
      iconColor: 'text-[#10B981]',
    },
  ];

  const trendData = [
    { name: 'Jan', incidents: 4, resolved: 3 },
    { name: 'Feb', incidents: 8, resolved: 6 },
    { name: 'Mar', incidents: 6, resolved: 5 },
    { name: 'Apr', incidents: 12, resolved: 9 },
    { name: 'May', incidents: 10, resolved: 8 },
    { name: 'Jun', incidents: 15, resolved: 12 },
  ];

  const categoryData = [
    { name: 'Malware', value: 35 },
    { name: 'Phishing', value: 25 },
    { name: 'DDoS', value: 20 },
    { name: 'Data Breach', value: 15 },
    { name: 'Other', value: 5 },
  ];

  const severityData = [
    { name: 'Critical', value: 12 },
    { name: 'High', value: 28 },
    { name: 'Medium', value: 42 },
    { name: 'Low', value: 18 },
  ];

  const SEVERITY_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981'];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={`border border-gray-200 rounded-xl shadow-sm border-l-4 ${stat.borderColor} bg-white`}>
              <CardContent className="pt-6 pb-6 px-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-[#6B7280]">{stat.label}</p>
                    <p className="text-3xl font-bold text-[#111827] mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.iconBg} p-3 rounded-xl`}>
                    <Icon className={`size-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white">
          <CardContent className="pt-6 pb-6 px-5">
            <div className="space-y-5">
              <div>
                <p className="text-sm text-[#6B7280]">Avg Response Time</p>
                <p className="text-3xl font-bold text-[#111827] mt-1">{stats.avgResponseTime}</p>
              </div>
              <div className="border-t border-gray-100" />
              <div>
                <p className="text-sm text-[#6B7280]">Critical Incidents</p>
                <p className="text-3xl font-bold text-[#EF4444] mt-1">{stats.criticalIncidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white">
          <CardContent className="pt-6 pb-6 px-5">
            <div className="space-y-5">
              <div>
                <p className="text-sm text-[#6B7280]">Active Investigators</p>
                <p className="text-3xl font-bold text-[#111827] mt-1">{stats.activeInvestigators}</p>
              </div>
              <div className="border-t border-gray-100" />
              <div>
                <p className="text-sm text-[#6B7280]">Cases This Month</p>
                <p className="text-3xl font-bold text-[#111827] mt-1">{stats.casesThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Trends */}
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-[#111827]">Incident Trends</CardTitle>
            <CardDescription className="text-[#6B7280]">Last 6 months activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trendData.map((item) => (
                <div key={item.name} className="rounded-lg border border-gray-200 bg-[#F8FAFC] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#111827]">{item.name}</p>
                    <p className="text-sm text-[#6B7280]">Resolved: {item.resolved}</p>
                  </div>
                  <p className="text-2xl font-bold text-[#111827] mt-2">{item.incidents}</p>
                  <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-[#2563EB]"
                      style={{ width: `${Math.min((item.incidents / 15) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-[#111827]">Severity Distribution</CardTitle>
            <CardDescription className="text-[#6B7280]">Current incident breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {severityData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between rounded-lg border border-gray-200 bg-[#F8FAFC] p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{item.name}</p>
                    <p className="text-xl font-bold text-[#111827]">{item.value}</p>
                  </div>
                  <div className="h-3 w-32 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: SEVERITY_COLORS[index % SEVERITY_COLORS.length],
                        width: `${(item.value / 42) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category and Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Category */}
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-[#111827]">Cases by Category</CardTitle>
            <CardDescription className="text-[#6B7280]">Distribution of incident types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={13} />
                <YAxis stroke="#6B7280" fontSize={13} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    color: '#111827',
                  }}
                />
                <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cases by Status */}
        <Card className="border border-gray-200 rounded-xl shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-[#111827]">Cases by Status</CardTitle>
            <CardDescription className="text-[#6B7280]">Breakdown by resolution status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Open', value: 45 },
                    { name: 'In Progress', value: 30 },
                    { name: 'Closed', value: 25 },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#EF4444" />
                  <Cell fill="#F59E0B" />
                  <Cell fill="#10B981" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    color: '#111827',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
