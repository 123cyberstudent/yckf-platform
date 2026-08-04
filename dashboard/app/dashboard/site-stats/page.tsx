'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Hash,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

interface SiteStat {
  id: number;
  section: string;
  stat: string;
  label: string;
  icon: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
}

const ICON_OPTIONS = [
  'ShieldAlert', 'Users', 'Handshake', 'Zap', 'Shield',
  'Globe', 'Lock', 'Eye', 'GraduationCap', 'BarChart3', 'FileText',
];

export default function SiteStatsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [stats, setStats] = useState<SiteStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<SiteStat | null>(null);

  const [form, setForm] = useState({
    stat: '',
    label: '',
    section: 'hero',
    icon: 'ShieldAlert',
    order: 0,
  });

  useEffect(() => {
    import('@/lib/permissions').then(({ getRoleFromCookie }) => {
      getRoleFromCookie().then((r) => {
        setRole(r);
        if (r !== 'admin' && r !== 'super_admin') router.push('/dashboard');
      });
    });
  }, [router]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/site-stats/admin');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'admin' || role === 'super_admin') fetchStats();
  }, [role, fetchStats]);

  const openCreate = () => {
    setEditing(null);
    setForm({ stat: '', label: '', section: 'hero', icon: 'ShieldAlert', order: stats.length });
    setDialogOpen(true);
  };

  const openEdit = (s: SiteStat) => {
    setEditing(s);
    setForm({ stat: s.stat, label: s.label, section: s.section, icon: s.icon || 'ShieldAlert', order: s.order });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!form.stat.trim() || !form.label.trim()) {
        toast.error('Stat value and label are required');
        return;
      }
      if (!Number.isInteger(form.order) || form.order < 0) {
        toast.error('Order must be a non-negative integer');
        return;
      }
      const url = editing ? `/api/site-stats/admin/${editing.id}` : '/api/site-stats/admin';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(editing ? 'Stat updated' : 'Stat created');
        setDialogOpen(false);
        fetchStats();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/site-stats/admin/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Stat deleted');
        setDeleteId(null);
        fetchStats();
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (s: SiteStat) => {
    try {
      const res = await fetch(`/api/site-stats/admin/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      if (res.ok) fetchStats();
    } catch {}
  };

  if (role !== 'admin' && role !== 'super_admin') return null;

  const heroStats = stats.filter((s) => s.section === 'hero');
  const impactStats = stats.filter((s) => s.section === 'impact');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Statistics</h1>
          <p className="text-sm text-gray-500 mt-1">Manage the stats displayed on the public homepage</p>
        </div>
        <Button onClick={openCreate} className="bg-[#2563EB] hover:bg-[#1D4ED8]">
          <Plus className="mr-2 h-4 w-4" /> Add Stat
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
        </div>
      ) : stats.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Hash className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">No stats yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your first homepage stat to get started</p>
            <Button onClick={openCreate} className="mt-4 bg-[#2563EB] hover:bg-[#1D4ED8]">
              <Plus className="mr-2 h-4 w-4" /> Add Stat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#2563EB]" />
                <h2 className="text-lg font-semibold">Hero Section (Stats Counter)</h2>
                <Badge variant="outline">{heroStats.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {heroStats.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No hero stats. Click &quot;Add Stat&quot; to create one.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Stat</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Icon</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {heroStats.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell><GripVertical className="h-4 w-4 text-gray-300" /></TableCell>
                        <TableCell className="font-bold text-[#2563EB]">{s.stat}</TableCell>
                        <TableCell>{s.label}</TableCell>
                        <TableCell><Badge variant="outline">{s.icon || '—'}</Badge></TableCell>
                        <TableCell>{s.order}</TableCell>
                        <TableCell>
                          <Badge variant={s.isActive ? 'default' : 'secondary'}>
                            {s.isActive ? 'Active' : 'Hidden'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(s)}>
                              {s.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(s.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#06292D]" />
                <h2 className="text-lg font-semibold">Impact Section (Bottom Banner)</h2>
                <Badge variant="outline">{impactStats.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {impactStats.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No impact stats. Click &quot;Add Stat&quot; to create one.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Stat</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {impactStats.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell><GripVertical className="h-4 w-4 text-gray-300" /></TableCell>
                        <TableCell className="font-bold text-[#2563EB]">{s.stat}</TableCell>
                        <TableCell>{s.label}</TableCell>
                        <TableCell>{s.order}</TableCell>
                        <TableCell>
                          <Badge variant={s.isActive ? 'default' : 'secondary'}>
                            {s.isActive ? 'Active' : 'Hidden'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(s)}>
                              {s.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(s.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Stat' : 'Add New Stat'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Stat Value</Label>
              <Input
                value={form.stat}
                onChange={(e) => setForm({ ...form, stat: e.target.value })}
                placeholder="e.g. 500+, 24/7, 98%"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Label</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Cybercrime Reports Handled"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Section</Label>
                <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hero">Hero (Stats Counter)</SelectItem>
                    <SelectItem value="impact">Impact (Bottom Banner)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Order</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>
            {form.section === 'hero' && (
              <div>
                <Label>Icon</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((ic) => (
                      <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-[#2563EB] hover:bg-[#1D4ED8]">
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Stat</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 py-2">Are you sure you want to delete this stat? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
