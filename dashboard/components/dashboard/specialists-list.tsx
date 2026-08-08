'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Mail, Phone, Briefcase, AlertCircle, X, Pencil, Trash2 } from 'lucide-react';
import { SPECIALISTS } from '@/lib/constants';

const SPECIALTY_OPTIONS = SPECIALISTS.map((s) => s.name);

interface Specialist {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  specialty: string;
  bio: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export function SpecialistsList() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Specialist | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', specialty: '', bio: '' });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [editTarget, setEditTarget] = useState<Specialist | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', specialty: '', bio: '' });

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchSpecialists = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/specialists');
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      const data = await res.json();
      setSpecialists(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load specialists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSpecialists(); }, []);

  const filtered = specialists.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${s.name} ${s.email} ${s.specialty}`.toLowerCase().includes(q);
  });

  const handleAdd = async () => {
    const errors: Record<string, string> = {};
    if (!addForm.name.trim()) errors.name = 'Name is required';
    if (!addForm.email.trim()) errors.email = 'Email is required';
    if (!addForm.specialty) errors.specialty = 'Specialty is required';
    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAddLoading(true);
    try {
      const res = await fetch('/api/specialists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create specialist');
      }
      showFeedback('success', 'Specialist created successfully');
      setAddOpen(false);
      setAddForm({ name: '', email: '', phone: '', specialty: '', bio: '' });
      await fetchSpecialists();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to create specialist');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    if (!editForm.name.trim()) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/specialists/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update');
      }
      showFeedback('success', 'Specialist updated');
      setEditOpen(false);
      setEditTarget(null);
      await fetchSpecialists();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirm !== deleteTarget.email) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/specialists/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to deactivate');
      showFeedback('success', `Specialist ${deleteTarget.name} deactivated`);
      setSpecialists((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirm('');
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to deactivate');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEdit = (s: Specialist) => {
    setEditTarget(s);
    setEditForm({ name: s.name, email: s.email, phone: s.phone || '', specialty: s.specialty, bio: s.bio || '' });
    setEditOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Specialists</h2>
            <p className="text-muted-foreground">Manage specialist professionals for case assignments</p>
          </div>
          <Button disabled>Add Specialist</Button>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">Loading specialists...</div>
      </div>
    );
  }

  if (error && specialists.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Specialists</h2>
            <p className="text-muted-foreground">Manage specialist professionals for case assignments</p>
          </div>
          <Button disabled>Add Specialist</Button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto size-12 text-red-500 mb-4" />
          <p className="text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchSpecialists}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Specialists</h2>
          <p className="text-muted-foreground">Manage specialist professionals for case assignments</p>
        </div>
        <Button onClick={() => { setAddForm({ name: '', email: '', phone: '', specialty: '', bio: '' }); setAddErrors({}); setAddOpen(true); }}>
          <UserPlus className="mr-2 size-4" />
          Add Specialist
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
            <Input placeholder="Search by name, email, or specialty" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          {specialists.length === 0 ? 'No specialists yet. Click "Add Specialist" to create one.' : 'No specialists match the search.'}
        </div>
      ) : (
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Name</th>
                  <th className="px-6 py-3 text-left font-semibold">Email</th>
                  <th className="px-6 py-3 text-left font-semibold">Phone</th>
                  <th className="px-6 py-3 text-left font-semibold">Specialty</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3 font-medium">{s.name}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-muted-foreground" />
                        <span>{s.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {s.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="size-4 text-muted-foreground" />
                          <span>{s.phone}</span>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className="bg-[#2563EB]/10 text-[#2563EB]">
                        <Briefcase className="size-3 mr-1" />
                        {s.specialty}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className={s.isActive ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                          <Pencil className="size-3.5 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(s)}>
                          <Trash2 className="size-3.5 mr-1" /> Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Specialist Dialog */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAddOpen(false)} />
          <div className="relative bg-card rounded-lg border border-border shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Specialist</h2>
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}><X className="size-4" /></Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <Input placeholder="Dr. Jane Smith" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
                {addErrors.name && <p className="text-xs text-red-500 mt-1">{addErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input type="email" placeholder="jane@example.com" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
                {addErrors.email && <p className="text-xs text-red-500 mt-1">{addErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input placeholder="+233 24 000 0000" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Specialty</label>
                <select value={addForm.specialty} onChange={(e) => setAddForm({ ...addForm, specialty: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="">Select specialty</option>
                  {SPECIALTY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {addErrors.specialty && <p className="text-xs text-red-500 mt-1">{addErrors.specialty}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px]" value={addForm.bio} onChange={(e) => setAddForm({ ...addForm, bio: e.target.value })} placeholder="Brief description of expertise..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={addLoading}>{addLoading ? 'Creating...' : 'Create Specialist'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Specialist Dialog */}
      {editOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditOpen(false)} />
          <div className="relative bg-card rounded-lg border border-border shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit Specialist</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}><X className="size-4" /></Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input value={editForm.email} disabled className="opacity-60" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Specialty</label>
                <select value={editForm.specialty} onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {SPECIALTY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px]" value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setDeleteTarget(null); setDeleteConfirm(''); }} />
          <div className="relative bg-card rounded-lg border border-destructive/30 shadow-xl w-full max-w-md p-6 space-y-4 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-destructive">Remove Specialist</h2>
              <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(null); setDeleteConfirm(''); }}><X className="size-4" /></Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">This will deactivate the specialist. They will no longer be available for new case assignments.</p>
              <p className="text-sm">Specialist: <span className="font-medium">{deleteTarget.name}</span> ({deleteTarget.email})</p>
              <div>
                <label className="block text-sm font-medium mb-1">Type the email to confirm</label>
                <Input placeholder={deleteTarget.email} value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteConfirm(''); }}>Cancel</Button>
              <Button variant="destructive" disabled={deleteConfirm !== deleteTarget.email || deleteLoading} onClick={handleDelete}>
                {deleteLoading ? 'Removing...' : 'Remove Specialist'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
