'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Smartphone,
  MapPin,
  Shield,
} from 'lucide-react';

const PAGE_SIZE = 25;

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-500/10 text-green-600 border-green-500/20',
  STOLEN: 'bg-red-500/10 text-red-500 border-red-500/20',
  RECOVERED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  UNPAIRED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

interface DeviceOwner {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
}

interface ProtectedDevice {
  id: string;
  internalDeviceId: string;
  deviceName: string;
  platform: string;
  deviceModel: string | null;
  osVersion: string | null;
  appVersion: string | null;
  status: string;
  protectionEnabled: boolean;
  stealMode: string;
  riskScore: number;
  lastSeenAt: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastAddress: string | null;
  markedStolenAt: string | null;
  recoveredAt: string | null;
  createdAt: string | null;
  owner: DeviceOwner | null;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<ProtectedDevice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/device?${params.toString()}`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) {
        toast.error(payload?.error || 'Unable to load devices');
      } else {
        setDevices(Array.isArray(payload.devices) ? payload.devices : []);
        setTotal(payload.total ?? 0);
      }
    } catch {
      toast.error('Network error loading devices');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(() => load(), search ? 400 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const act = async (device: ProtectedDevice, action: 'mark-stolen' | 'recover') => {
    setActingId(device.id);
    try {
      const confirmed = window.confirm(
        action === 'mark-stolen'
          ? `Report "${device.deviceName}" as STOLEN? A theft report will be created and the owner + admins notified.`
          : `Mark "${device.deviceName}" as RECOVERED?`
      );
      if (!confirmed) return;

      const res = await fetch(`/api/device/${device.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, description: `Marked ${action} from YCKF dashboard` }),
      });
      const payload = await res.json();
      if (res.ok) {
        toast.success(payload.ticketNumber ? `Theft report ${payload.ticketNumber} opened` : 'Device updated');
        load();
      } else {
        toast.error(payload?.error || 'Update failed');
      }
    } catch {
      toast.error('Network error updating device');
    } finally {
      setActingId(null);
    }
  };

  const mappedLink = (d: ProtectedDevice) =>
    d.lastLatitude != null && d.lastLongitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${d.lastLatitude},${d.lastLongitude}`
      : null;

  const filtered = useMemo(
    () => devices,
    [devices]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Smartphone className="size-6 text-[#2563EB]" />
          Protected Devices
        </h1>
        <p className="text-sm text-gray-500">
          Devices enrolled in Stolen Phone Protection across YCKF accounts. Report a device stolen to open a theft case and
          notify the owner.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Device Registry</CardTitle>
            <CardDescription>{total} device{total === 1 ? '' : 's'} registered</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-gray-400" />
              <Input
                placeholder="Search device / owner…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="STOLEN">Stolen</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="RECOVERED">Recovered</SelectItem>
                <SelectItem value="UNPAIRED">Unpaired</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && devices.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No protected devices found. Devices appear here once a user enables Stolen Phone Protection in the mobile app.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((d) => {
                const map = mappedLink(d);
                const stolen = d.status === 'STOLEN';
                return (
                  <div
                    key={d.id}
                    className={`rounded-xl border p-4 ${stolen ? 'border-red-200 bg-red-50/50' : 'border-gray-200'}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2.5 ${stolen ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-[#2563EB]'}`}>
                          <Smartphone className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">{d.deviceName}</span>
                            <Badge className={statusColors[d.status] ?? statusColors.ACTIVE}>{d.status}</Badge>
                            {d.riskScore >= 60 && !stolen && (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Risk {d.riskScore}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {d.platform === 'IOS' ? 'iOS' : 'Android'}
                            {d.deviceModel ? ` · ${d.deviceModel}` : ''}
                            {d.osVersion ? ` · OS ${d.osVersion}` : ''}
                            {d.appVersion ? ` · app ${d.appVersion}` : ''}
                          </p>
                          <p className="text-xs text-gray-500">
                            Owner: {d.owner?.fullName || d.owner?.email || 'unknown'}
                            {d.owner?.phone ? ` · ${d.owner.phone}` : ''}
                          </p>
                          <p className="text-xs text-gray-500">
                            Last seen: {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : 'never'}
                            {d.markedStolenAt ? ` · Stolen at ${new Date(d.markedStolenAt).toLocaleString()}` : ''}
                          </p>
                          {d.lastAddress && <p className="text-xs text-gray-400 mt-0.5">{d.lastAddress}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:shrink-0">
                        {map && (
                          <a href={map} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm">
                              <MapPin className="size-4 mr-1" /> Map
                            </Button>
                          </a>
                        )}
                        {!stolen ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => act(d, 'mark-stolen')}
                            disabled={actingId === d.id}
                          >
                            {actingId === d.id ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4 mr-1" />}
                            Mark Stolen
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => act(d, 'recover')} disabled={actingId === d.id}>
                            {actingId === d.id ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 mr-1" />}
                            Recovered
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(total / PAGE_SIZE)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <Shield className="size-4 mt-0.5 shrink-0" />
        <p>
          YCKF cannot bypass Android or iOS security. Detected signals are limited to what the OS legitimately exposes
          (heartbeat location, account events). iPhone owners are directed to also enable Apple Find My Lost Mode.
        </p>
      </div>
    </div>
  );
}