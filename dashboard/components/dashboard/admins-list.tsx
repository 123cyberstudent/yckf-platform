'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Shield, UserPlus, Edit3, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export function AdminsList() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [addForm, setAddForm] = useState({ fullName: '', email: '', password: '' });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.users || [];
      setAdmins(list.filter((u: any) => u.role === 'admin' || u.role === 'ADMIN'));
    } catch {
      setError('Failed to load admins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const filtered = admins.filter((a) =>
    a.fullName.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    const errs: Record<string, string> = {};
    if (!addForm.fullName.trim()) errs.fullName = 'Name is required';
    if (!addForm.email.trim()) errs.email = 'Email is required';
    if (!addForm.password || addForm.password.length < 8) errs.password = 'Min 8 characters with number & special char';
    setAddErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, role: 'ADMIN' }),
      });
      if (!res.ok) {
        const d = await res.json();
        setAddErrors({ form: d.error || 'Failed to create admin' });
        return;
      }
      setAddForm({ fullName: '', email: '', password: '' });
      setAddOpen(false);
      fetchAdmins();
    } catch {
      setAddErrors({ form: 'Failed to create admin' });
    }
  };

  const handleToggleActive = async (admin: AdminUser) => {
    try {
      const res = await fetch(`/api/users/${admin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !admin.isActive }),
      });
      if (res.ok) fetchAdmins();
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admins (Secondary Admins)</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage administrator accounts</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="mr-2 size-4" />
          Add Admin
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search admins..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="text-xs">
              {filtered.length} admin{filtered.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No admins found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Created</th>
                    <th className="pb-3 font-medium">Last Login</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((admin) => (
                    <tr key={admin.id} className="border-b last:border-0">
                      <td className="py-3 text-sm font-medium">{admin.fullName}</td>
                      <td className="py-3 text-sm text-muted-foreground">{admin.email}</td>
                      <td className="py-3">
                        <Badge variant={admin.isActive ? 'default' : 'secondary'} className="text-xs">
                          {admin.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" title="Edit">
                            <Edit3 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`size-8 ${admin.isActive ? 'text-red-500 hover:text-red-600' : 'text-green-500 hover:text-green-600'}`}
                            onClick={() => handleToggleActive(admin)}
                            title={admin.isActive ? 'Suspend' : 'Activate'}
                          >
                            {admin.isActive ? <Trash2 className="size-3.5" /> : <Check className="size-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAddOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Admin</h2>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setAddOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            {addErrors.form && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="size-4" />
                <AlertDescription>{addErrors.form}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <Input value={addForm.fullName} onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })} />
                {addErrors.fullName && <p className="text-xs text-red-500 mt-1">{addErrors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
                {addErrors.email && <p className="text-xs text-red-500 mt-1">{addErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <Input type="password" placeholder="Min 8 chars, number + special char" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} />
                {addErrors.password && <p className="text-xs text-red-500 mt-1">{addErrors.password}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Create Admin</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
