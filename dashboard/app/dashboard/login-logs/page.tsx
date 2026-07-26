'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleFromCookie } from '@/lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface LoginLog {
  id: number;
  email: string;
  userId: number | null;
  success: boolean;
  ipAddress: string;
  userAgent: string | null;
  deviceInfo: string | null;
  failureReason: string | null;
  createdAt: string;
  user?: { id: number; fullName: string } | null;
}

interface Stats {
  total: number;
  successful: number;
  failed: number;
  uniqueUsers: number;
}

export default function LoginLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [emailFilter, setEmailFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState<string>('all');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    getRoleFromCookie().then((role) => {
      if (!role || role !== 'admin') {
        router.replace('/dashboard');
      } else {
        setAuthorized(true);
      }
    });
  }, [router]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (emailFilter) params.set('email', emailFilter);
      if (successFilter !== 'all') params.set('success', successFilter);

      const res = await fetch(`/api/admin/login-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('Failed to fetch login logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/login-logs/stats');
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    if (!authorized) return;
    fetchStats();
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    fetchLogs();
  }, [authorized, page, successFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Login Logs</h1>
        <p className="text-muted-foreground mt-1">Monitor login attempts and device details</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Attempts</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Unique Users</p>
              <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                placeholder="Filter by email"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={successFilter}
                onChange={(e) => { setSuccessFilter(e.target.value); setPage(1); }}
                className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
              >
                <option value="all">All Results</option>
                <option value="true">Successful</option>
                <option value="false">Failed</option>
              </select>
              <Button variant="outline" onClick={handleSearch}>Search</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          Loading login logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          No login logs found.
        </div>
      ) : (
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Time</th>
                  <th className="px-6 py-3 text-left font-semibold">Email</th>
                  <th className="px-6 py-3 text-left font-semibold">Result</th>
                  <th className="px-6 py-3 text-left font-semibold">IP Address</th>
                  <th className="px-6 py-3 text-left font-semibold">User Agent</th>
                  <th className="px-6 py-3 text-left font-semibold">Failure Reason</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-medium">{log.email}</td>
                    <td className="px-6 py-3">
                      <Badge
                        variant="outline"
                        className={log.success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}
                      >
                        {log.success ? 'Success' : 'Failed'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm font-mono">{log.ipAddress}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground max-w-[200px] truncate" title={log.userAgent || ''}>
                      {log.userAgent || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {log.failureReason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
