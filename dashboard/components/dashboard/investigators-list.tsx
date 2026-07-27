'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, Mail, AlertCircle, X } from 'lucide-react';
import { getRoleFromCookie } from '@/lib/permissions';

interface Volunteer {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'investigator' | 'volunteer';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  lastLogin: Date | null;
}

export function InvestigatorsList() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [suspendLoading, setSuspendLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [addForm, setAddForm] = useState({ fullName: '', email: '', password: '' });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  const [editTarget, setEditTarget] = useState<Volunteer | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', role: 'volunteer' as string, isActive: true });

  const [deleteTarget, setDeleteTarget] = useState<Volunteer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/investigators');

      if (!response.ok) {
        throw new Error(`Failed to load volunteers: ${response.status}`);
      }

      const data = await response.json();
      const parsed = data.map((inv: any) => ({
        ...inv,
        createdAt: new Date(inv.createdAt),
        lastLogin: inv.lastLogin ? new Date(inv.lastLogin) : null,
      }));
      setVolunteers(parsed);
    } catch (error) {
      console.error('Failed to fetch volunteers:', error);
      setError('Failed to load volunteers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getRoleFromCookie().then(setCurrentRole);
  }, []);

  const canPerformActions = currentRole === 'admin';
  const isVolunteerRole = currentRole === 'volunteer';

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const filteredVolunteers = volunteers.filter((inv) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${inv.name} ${inv.email}`.toLowerCase().includes(query);
  });

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-500',
    inactive: 'bg-gray-500/10 text-gray-500',
    suspended: 'bg-red-500/10 text-red-500',
  };

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return 'Password must be at least 8 characters';
    if (!/\d/.test(pw)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return 'Password must contain at least one special character';
    return null;
  };

  const handleAdd = async () => {
    const errors: Record<string, string> = {};
    if (!addForm.fullName.trim()) errors.fullName = 'Name is required';
    if (!addForm.email.trim()) errors.email = 'Email is required';
    if (!addForm.password) errors.password = 'Password is required';
    else {
      const pwErr = validatePassword(addForm.password);
      if (pwErr) errors.password = pwErr;
    }
    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAddLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addForm.email, password: addForm.password, fullName: addForm.fullName, role: 'VOLUNTEER' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create volunteer');
      }
      showFeedback('success', 'Volunteer created successfully');
      setAddOpen(false);
      setAddForm({ fullName: '', email: '', password: '' });
      await fetchVolunteers();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to create volunteer');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    if (!editForm.fullName.trim()) return;

    setEditLoading(true);
    try {
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: editForm.fullName, role: editForm.role, isActive: editForm.isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update volunteer');
      }
      showFeedback('success', 'Volunteer updated successfully');
      setEditOpen(false);
      setEditTarget(null);
      await fetchVolunteers();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update volunteer');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirm !== deleteTarget.email) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete volunteer');
      }
      showFeedback('success', `Volunteer ${deleteTarget.name} deleted`);
      setVolunteers((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirm('');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete volunteer');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSuspend = async (inv: Volunteer) => {
    const isSuspended = inv.status === 'suspended';
    setSuspendLoading(inv.id);
    try {
      const res = await fetch(`/api/users/${inv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: isSuspended }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update status');
      }
      showFeedback('success', isSuspended ? 'Volunteer unsuspended' : 'Volunteer suspended');
      setVolunteers((prev) => isSuspended
        ? prev.map((i) => i.id === inv.id ? { ...i, status: 'active' as const } : i)
        : prev.map((i) => i.id === inv.id ? { ...i, status: 'suspended' as const } : i)
      );
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update status');
    } finally {
      setSuspendLoading(null);
    }
  };

  const openEdit = (inv: Volunteer) => {
    setEditTarget(inv);
    setEditForm({ fullName: inv.name, role: inv.role || 'volunteer', isActive: inv.status !== 'suspended' });
    setEditOpen(true);
  };

  const openDelete = (inv: Volunteer) => {
    setDeleteTarget(inv);
    setDeleteConfirm('');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Volunteers</h2>
            <p className="text-muted-foreground">Manage volunteer team members</p>
          </div>
          <Button disabled>Add Volunteer</Button>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          Loading volunteers...
        </div>
      </div>
    );
  }

  if (error && volunteers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Volunteers</h2>
            <p className="text-muted-foreground">Manage volunteer team members</p>
          </div>
          <Button disabled>Add Volunteer</Button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto size-12 text-red-500 mb-4" />
          <p className="text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => fetchVolunteers()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Volunteers</h2>
          <p className="text-muted-foreground">Manage volunteer team members</p>
        </div>
        <Button onClick={() => { setAddForm({ fullName: '', email: '', password: '' }); setAddErrors({}); setAddOpen(true); }} className={currentRole && currentRole !== 'admin' ? 'hidden' : ''}>
          <User className="mr-2 size-4" />
          Add Volunteer
        </Button>
      </div>

      {feedback && (
        <div className={`rounded-lg p-4 flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <AlertCircle className={`size-5 ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
          <p className={`text-sm font-medium ${feedback.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{feedback.message}</p>
        </div>
      )}

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Search volunteers by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredVolunteers.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          {volunteers.length === 0
            ? 'No volunteers found.'
            : 'No volunteers match the current search.'}
        </div>
      ) : (
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Name</th>
                  {!isVolunteerRole && <th className="px-6 py-3 text-left font-semibold">Email</th>}
                  <th className="px-6 py-3 text-left font-semibold">Role</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">Joined</th>
                  {!isVolunteerRole && <th className="px-6 py-3 text-left font-semibold">Last Login</th>}
                  {canPerformActions && <th className="px-6 py-3 text-left font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredVolunteers.map((inv) => (
                  <tr key={inv.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3 font-medium">{inv.name}</td>
                    {!isVolunteerRole && (
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-muted-foreground" />
                        <span>{inv.email}</span>
                      </div>
                    </td>
                    )}
                    <td className="px-6 py-3">
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
                        {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className={statusColors[inv.status] || statusColors.inactive}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {inv.createdAt.toLocaleDateString()}
                    </td>
                    {!isVolunteerRole && (
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {inv.lastLogin ? inv.lastLogin.toLocaleDateString() : 'Never'}
                    </td>
                    )}
                    {canPerformActions && (
                    <td className="px-6 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(inv)}>Edit</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={suspendLoading === inv.id}
                          onClick={() => handleSuspend(inv)}
                        >
                          {suspendLoading === inv.id ? 'Saving...' : inv.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-red-700"
                          onClick={() => openDelete(inv)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Volunteer Dialog */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAddOpen(false)} />
          <div className="relative bg-card rounded-lg border border-border shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Volunteer</h2>
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <Input placeholder="Jane Smith" value={addForm.fullName} onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })} />
                {addErrors.fullName && <p className="text-xs text-red-500 mt-1">{addErrors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input type="email" placeholder="jane@example.com" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
                {addErrors.email && <p className="text-xs text-red-500 mt-1">{addErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <Input type="password" placeholder="Min 8 chars, number + special char" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} />
                {addErrors.password && <p className="text-xs text-red-500 mt-1">{addErrors.password}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={addLoading}>
                {addLoading ? 'Creating...' : 'Create Volunteer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Volunteer Dialog */}
      {editOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditOpen(false)} />
          <div className="relative bg-card rounded-lg border border-border shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit Volunteer</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input value={editTarget.email} disabled className="opacity-60" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="volunteer">Volunteer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${editForm.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editForm.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm">{editForm.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Login</label>
                <Input value={editTarget.lastLogin ? new Date(editTarget.lastLogin).toLocaleString() : 'Never'} disabled className="opacity-60" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Volunteer Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setDeleteTarget(null); setDeleteConfirm(''); }} />
          <div className="relative bg-card rounded-lg border border-destructive/30 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-destructive">Delete Volunteer</h2>
              <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(null); setDeleteConfirm(''); }}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This action is <span className="font-semibold text-destructive">permanent</span> and cannot be undone.
              </p>
              <p className="text-sm">Volunteer: <span className="font-medium">{deleteTarget.name}</span> ({deleteTarget.email})</p>
              <div>
                <label className="block text-sm font-medium mb-1">Type the email to confirm</label>
                <Input
                  placeholder={deleteTarget.email}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteConfirm(''); }}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteConfirm !== deleteTarget.email || deleteLoading}
                onClick={handleDelete}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Volunteer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
