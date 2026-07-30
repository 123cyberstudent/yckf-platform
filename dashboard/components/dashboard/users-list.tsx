'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Mail, UserPlus, AlertCircle, Download, FileDown, X, Smartphone, Globe } from 'lucide-react';
import type { User } from '@/lib/types';
import { getRoleFromCookie } from '@/lib/permissions';
import { generatePDFReport } from '@/lib/pdf-utils';
import { logExport } from '@/lib/export-logger';

export function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [suspendLoading, setSuspendLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [addForm, setAddForm] = useState({ fullName: '', email: '', password: '', role: 'USER' as string });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', role: 'USER' as string, isActive: true });

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      setUsingMockData(false);

      const response = await fetch('/api/users');

      if (!response.ok) {
        if (response.status === 401) {
          setUsingMockData(true);
        }
        throw new Error(`Failed to load users: ${response.status}`);
      }

      const data = await response.json();
      const parsed = data.map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
      }));

      setUsers(parsed);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to load users. Please try again later.');

      try {
        const mockResponse = await fetch('/api/users/mock');
        if (mockResponse.ok) {
          const mockData = await mockResponse.json();
          const parsed = mockData.map((user: any) => ({
            ...user,
            createdAt: new Date(user.createdAt),
            lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
          }));
          setUsers(parsed);
          setUsingMockData(true);
        }
      } catch (mockError) {
        console.error('Failed to load mock users:', mockError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getRoleFromCookie().then(setCurrentRole);
  }, []);

  const canPerformActions = currentRole === 'admin';

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const items = await response.json();

      const headers = ['ID', 'Email', 'Full Name', 'Role', 'Platform', 'Active', 'Last Login', 'Created At'];
      const rows = items.map((item: any) => [
        item.id,
        item.email,
        item.name,
        item.role,
        item.platform || 'web',
        item.status === 'suspended' ? 'No' : 'Yes',
        item.lastLogin || 'Never',
        item.createdAt,
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'users.csv';
      link.click();
      URL.revokeObjectURL(url);
      logExport('users', 'csv', items.length);
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    const active = users.filter((u) => u.status === 'active').length;
    const inactive = users.filter((u) => u.status === 'inactive' || u.status === 'suspended').length;
    const mobileUsers = users.filter((u) => (u.platform || 'web') === 'mobile').length;
    const webUsers = users.filter((u) => (u.platform || 'web') === 'web').length;

    generatePDFReport({
      title: 'USER MANAGEMENT REPORT',
      subtitle: `Total: ${users.length} | Mobile: ${mobileUsers} | Web: ${webUsers} | Active: ${active} | Inactive: ${inactive}`,
      columns: [
        { header: 'ID', key: 'id' },
        { header: 'Email', key: 'email' },
        { header: 'Full Name', key: 'name' },
        { header: 'Role', key: 'role' },
        { header: 'Platform', key: 'platformDisplay' },
        { header: 'Status', key: 'status' },
        { header: 'Last Login', key: 'lastLogin' },
        { header: 'Created At', key: 'createdAt' },
      ],
      rows: filtered.map((u) => ({
        ...u,
        platformDisplay: (u.platform || 'web') === 'mobile' ? 'Mobile App' : 'Website',
        lastLogin: u.lastLogin ?? 'Never',
      })),
      fileName: 'users-report',
      summary: [
        { label: 'Total Users', value: users.length },
        { label: 'Mobile App', value: mobileUsers },
        { label: 'Website', value: webUsers },
        { label: 'Active', value: active },
        { label: 'Inactive', value: inactive },
      ],
    });
    logExport('users', 'pdf', filtered.length);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery = !query || `${user.name} ${user.email}`.toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesPlatform = platformFilter === 'all' || (user.platform || 'web') === platformFilter;
      return matchesQuery && matchesRole && matchesStatus && matchesPlatform;
    });
  }, [users, search, roleFilter, statusFilter, platformFilter]);

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500/10 text-red-500',
    investigator: 'bg-blue-500/10 text-blue-500',
    volunteer: 'bg-blue-500/10 text-blue-500',
    user: 'bg-gray-500/10 text-gray-500',
  };

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
        body: JSON.stringify({ email: addForm.email, password: addForm.password, fullName: addForm.fullName, role: addForm.role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create user');
      }
      showFeedback('success', 'User created successfully');
      setAddOpen(false);
      setAddForm({ fullName: '', email: '', password: '', role: 'USER' });
      await fetchUsers();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    if (!editForm.fullName.trim()) {
      setEditLoading(false);
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: editForm.fullName, role: editForm.role, isActive: editForm.isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update user');
      }
      showFeedback('success', 'User updated successfully');
      setEditOpen(false);
      setEditTarget(null);
      await fetchUsers();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update user');
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
        throw new Error(data.error || 'Failed to delete user');
      }
      showFeedback('success', `User ${deleteTarget.name} deleted`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirm('');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSuspend = async (user: User) => {
    const isSuspended = user.status === 'suspended';
    setSuspendLoading(user.id as string);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: isSuspended }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update user status');
      }
      showFeedback('success', isSuspended ? 'User unsuspended' : 'User suspended');
      setUsers((prev) => isSuspended
        ? prev.map((u) => u.id === user.id ? { ...u, status: 'active' as const } : u)
        : prev.map((u) => u.id === user.id ? { ...u, status: 'suspended' as const } : u)
      );
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update user status');
    } finally {
      setSuspendLoading(null);
    }
  };

  const openEdit = (user: User) => {
    setEditTarget(user);
    setEditForm({ fullName: user.name, role: user.role, isActive: user.status !== 'suspended' });
    setEditOpen(true);
  };

  const openDelete = (user: User) => {
    setDeleteTarget(user);
    setDeleteConfirm('');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground mt-1">Manage system users and access control</p>
          </div>
          <Button disabled>
            <UserPlus className="mr-2 size-4" />
            Add User
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          Loading users...
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground mt-1">Manage system users and access control</p>
          </div>
          <Button disabled>
            <UserPlus className="mr-2 size-4" />
            Add User
          </Button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-10 text-center">
          <AlertCircle className="mx-auto size-12 text-red-500 mb-4" />
          <p className="text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => fetchUsers()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage system users and access control</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} disabled={exporting}>
            <Download className="mr-2 size-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="mr-2 size-4" />
            Download PDF
          </Button>
          <Button onClick={() => { setAddForm({ fullName: '', email: '', password: '', role: 'USER' }); setAddErrors({}); setAddOpen(true); }} className={currentRole && currentRole !== 'super_admin' ? 'hidden' : ''}>
            <UserPlus className="mr-2 size-4" />
            Add User
          </Button>
        </div>
      </div>

      {feedback && (
        <div className={`rounded-lg p-4 flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <AlertCircle className={`size-5 ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
          <p className={`text-sm font-medium ${feedback.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{feedback.message}</p>
        </div>
      )}

      {usingMockData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Using Demo Data</p>
            <p className="text-sm text-yellow-700">
              The backend connection is unavailable. Showing sample user data for demonstration purposes.
            </p>
          </div>
        </div>
      )}

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input placeholder="Search users by name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="volunteer">Volunteer</option>
                <option value="investigator">Investigator</option>
                <option value="user">User</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
              <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                <option value="all">All Platforms</option>
                <option value="mobile">Mobile App</option>
                <option value="web">Website</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          {users.length === 0 ? 'No users found.' : 'No users match the current filters.'}
        </div>
      ) : (
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Name</th>
                  <th className="px-6 py-3 text-left font-semibold">Email</th>
                  <th className="px-6 py-3 text-left font-semibold">Role</th>
                  <th className="px-6 py-3 text-left font-semibold">Platform</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">Last Login</th>
                  {canPerformActions && <th className="px-6 py-3 text-left font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3 font-medium">{user.name}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-muted-foreground" />
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className={roleColors[user.role] || roleColors.user}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        {(user.platform || 'web') === 'mobile' ? (
                          <>
                            <Smartphone className="size-3.5 text-[#2563EB]" />
                            <Badge variant="outline" className="bg-[#2563EB]/10 text-[#2563EB]">Mobile</Badge>
                          </>
                        ) : (
                          <>
                            <Globe className="size-3.5 text-[#06292D]" />
                            <Badge variant="outline" className="bg-[#06292D]/10 text-[#06292D]">Web</Badge>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className={statusColors[user.status] || statusColors.inactive}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    {canPerformActions && (
                    <td className="px-6 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>Edit</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={suspendLoading === user.id}
                          onClick={() => handleSuspend(user)}
                        >
                          {suspendLoading === user.id ? 'Saving...' : user.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-red-700"
                          onClick={() => openDelete(user)}
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

      {/* Add User Dialog */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAddOpen(false)} />
          <div className="relative bg-card rounded-lg border border-border shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add User</h2>
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <Input placeholder="John Doe" value={addForm.fullName} onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })} />
                {addErrors.fullName && <p className="text-xs text-red-500 mt-1">{addErrors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input type="email" placeholder="john@example.com" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
                {addErrors.email && <p className="text-xs text-red-500 mt-1">{addErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <Input type="password" placeholder="Min 8 chars, number + special char" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} />
                {addErrors.password && <p className="text-xs text-red-500 mt-1">{addErrors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="USER">User</option>
                  <option value="VOLUNTEER">Volunteer</option>
                  <option value="INVESTIGATOR">Investigator</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={addLoading}>
                {addLoading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Dialog */}
      {editOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditOpen(false)} />
          <div className="relative bg-card rounded-lg border border-border shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit User</h2>
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
                  <option value="user">User</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="investigator">Investigator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
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
                <label className="block text-sm font-medium mb-1">Created</label>
                <Input value={editTarget.createdAt ? new Date(editTarget.createdAt).toLocaleDateString() : 'Unknown'} disabled className="opacity-60" />
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

      {/* Delete User Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setDeleteTarget(null); setDeleteConfirm(''); }} />
          <div className="relative bg-card rounded-lg border border-destructive/30 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-destructive">Delete User</h2>
              <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(null); setDeleteConfirm(''); }}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This action is <span className="font-semibold text-destructive">permanent</span> and cannot be undone.
              </p>
              <p className="text-sm">User: <span className="font-medium">{deleteTarget.name}</span> ({deleteTarget.email})</p>
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
                {deleteLoading ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
