'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, UserPlus, AlertCircle, X, Pencil, Trash2, GripVertical, Link2, AtSign, Mail } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  role: string;
  bio: string;
  email: string;
  linkedin: string;
  twitter: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = {
  name: '',
  role: '',
  bio: '',
  email: '',
  linkedin: '',
  twitter: '',
  imageUrl: '',
  sortOrder: 0,
};

export function MembersList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/members');
      if (!res.ok) throw new Error(`Failed to load members: ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.members || data.data || [];
      const sorted = list
        .map((m: any) => ({
          id: m.id || m._id || `mock-${Date.now()}`,
          name: m.name || '',
          role: m.role || '',
          bio: m.bio || '',
          email: m.email || '',
          linkedin: m.linkedin || '',
          twitter: m.twitter || '',
          imageUrl: m.imageUrl || '',
          sortOrder: m.sortOrder ?? 0,
          isActive: m.isActive !== false,
          createdAt: m.createdAt || new Date().toISOString(),
        }))
        .sort((a: Member, b: Member) => a.sortOrder - b.sortOrder);
      setMembers(sorted);
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setError('Failed to load members. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [members, search]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const colors = ['#2563EB', '#06292D', '#2DD4BF', '#7C3AED', '#DC2626', '#D97706'];

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const validateForm = (form: typeof emptyForm): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.role.trim()) errors.role = 'Role/Title is required';
    return errors;
  };

  const handleAdd = async () => {
    const errors = validateForm(addForm);
    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAddLoading(true);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        body: JSON.stringify({
          name: addForm.name.trim(),
          role: addForm.role.trim(),
          bio: addForm.bio.trim(),
          email: addForm.email.trim(),
          linkedin: addForm.linkedin.trim(),
          twitter: addForm.twitter.trim(),
          imageUrl: addForm.imageUrl.trim(),
          sortOrder: addForm.sortOrder,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create member');
      }
      showFeedback('success', 'Member created successfully');
      setAddOpen(false);
      setAddForm(emptyForm);
      setAddErrors({});
      await fetchMembers();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to create member');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    const errors = validateForm(editForm);
    if (Object.keys(errors).length > 0) return;

    setEditLoading(true);
    try {
      const res = await fetch(`/api/members/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name.trim(),
          role: editForm.role.trim(),
          bio: editForm.bio.trim(),
          email: editForm.email.trim(),
          linkedin: editForm.linkedin.trim(),
          twitter: editForm.twitter.trim(),
          imageUrl: editForm.imageUrl.trim(),
          sortOrder: editForm.sortOrder,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update member');
      }
      showFeedback('success', 'Member updated successfully');
      setEditOpen(false);
      setEditTarget(null);
      await fetchMembers();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update member');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/members/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete member');
      }
      showFeedback('success', `Member "${deleteTarget.name}" removed`);
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete member');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEdit = (member: Member) => {
    setEditTarget(member);
    setEditForm({
      name: member.name,
      role: member.role,
      bio: member.bio,
      email: member.email,
      linkedin: member.linkedin,
      twitter: member.twitter,
      imageUrl: member.imageUrl,
      sortOrder: member.sortOrder,
    });
    setEditOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">YCKF Members</h1>
            <p className="text-muted-foreground mt-1">Manage team member profiles displayed on the public website</p>
          </div>
          <Button disabled>
            <UserPlus className="mr-2 size-4" />
            Add Member
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          Loading members...
        </div>
      </div>
    );
  }

  if (error && members.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">YCKF Members</h1>
            <p className="text-muted-foreground mt-1">Manage team member profiles displayed on the public website</p>
          </div>
          <Button disabled>
            <UserPlus className="mr-2 size-4" />
            Add Member
          </Button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-10 text-center">
          <AlertCircle className="mx-auto size-12 text-red-500 mb-4" />
          <p className="text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => fetchMembers()}>
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
          <h1 className="text-3xl font-bold">YCKF Members</h1>
          <p className="text-muted-foreground mt-1">Manage team member profiles displayed on the public website</p>
        </div>
        <Button onClick={() => { setAddForm(emptyForm); setAddErrors({}); setAddOpen(true); }}>
          <UserPlus className="mr-2 size-4" />
          Add Member
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
            <Input placeholder="Search members by name, role, or email" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          {members.length === 0 ? 'No members yet. Add your first team member.' : 'No members match the current search.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member) => (
            <Card key={member.id} className="glass-card overflow-hidden flex flex-col">
              <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-start gap-4 mb-3">
                  <div
                    className="flex-shrink-0 size-12 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: member.imageUrl ? undefined : getAvatarColor(member.name) }}
                  >
                    {member.imageUrl ? (
                      <img src={member.imageUrl} alt={member.name} className="size-12 rounded-full object-cover" />
                    ) : (
                      getInitials(member.name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base truncate">{member.name}</h3>
                      {!member.isActive && (
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-500 text-[10px]">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#2563EB] font-medium truncate">{member.role}</p>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <GripVertical className="size-4" />
                    <span className="text-xs">{member.sortOrder}</span>
                  </div>
                </div>

                {member.bio && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3 flex-1">{member.bio}</p>
                )}

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    {member.linkedin && (
                      <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#0A66C2] transition-colors" title="LinkedIn">
                        <Link2 className="size-4" />
                      </a>
                    )}
                    {member.twitter && (
                      <a href={member.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#1DA1F2] transition-colors" title="Twitter">
                        <AtSign className="size-4" />
                      </a>
                    )}
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="text-muted-foreground hover:text-[#2563EB] transition-colors" title="Email">
                        <Mail className="size-4" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(member)}>
                      <Pencil className="size-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(member)}>
                      <Trash2 className="size-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Member Dialog */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAddOpen(false)} />
          <div className="relative bg-card rounded-lg border border-border shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Member</h2>
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name <span className="text-destructive">*</span></label>
                <Input placeholder="e.g. Dr. Sarah Chen" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
                {addErrors.name && <p className="text-xs text-red-500 mt-1">{addErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role / Title <span className="text-destructive">*</span></label>
                <Input placeholder="e.g. Founder & Supervisor" value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })} />
                {addErrors.role && <p className="text-xs text-red-500 mt-1">{addErrors.role}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <Textarea placeholder="Brief description of the member's background and role..." rows={3} value={addForm.bio} onChange={(e) => setAddForm({ ...addForm, bio: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input type="email" placeholder="member@yckf.org" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
                  <Input placeholder="https://linkedin.com/in/..." value={addForm.linkedin} onChange={(e) => setAddForm({ ...addForm, linkedin: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Twitter URL</label>
                  <Input placeholder="https://twitter.com/..." value={addForm.twitter} onChange={(e) => setAddForm({ ...addForm, twitter: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <Input placeholder="https://... (leave blank for initials avatar)" value={addForm.imageUrl} onChange={(e) => setAddForm({ ...addForm, imageUrl: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sort Order</label>
                <Input type="number" placeholder="0" value={addForm.sortOrder} onChange={(e) => setAddForm({ ...addForm, sortOrder: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={addLoading}>
                {addLoading ? 'Creating...' : 'Create Member'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Dialog */}
      {editOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditOpen(false)} />
          <div className="relative bg-card rounded-lg border border-border shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit Member</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name <span className="text-destructive">*</span></label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role / Title <span className="text-destructive">*</span></label>
                <Input value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <Textarea rows={3} value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
                  <Input value={editForm.linkedin} onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Twitter URL</label>
                  <Input value={editForm.twitter} onChange={(e) => setEditForm({ ...editForm, twitter: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <Input value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sort Order</label>
                <Input type="number" value={editForm.sortOrder} onChange={(e) => setEditForm({ ...editForm, sortOrder: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Created</label>
                <Input value={editTarget.createdAt ? new Date(editTarget.createdAt).toLocaleDateString() : 'Unknown'} disabled className="opacity-60" />
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

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-card rounded-lg border border-destructive/30 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-destructive">Remove Member</h2>
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This will soft-delete the member. They can be restored later if needed.
              </p>
              <p className="text-sm">
                Member: <span className="font-medium">{deleteTarget.name}</span>
                <span className="text-muted-foreground ml-1">({deleteTarget.role})</span>
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" disabled={deleteLoading} onClick={handleDelete}>
                {deleteLoading ? 'Removing...' : 'Remove Member'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
