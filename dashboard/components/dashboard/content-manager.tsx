'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Save, Plus, Trash2, FileText, ArrowLeft, Pencil } from 'lucide-react';

interface ContentPage {
  id: number;
  slug: string;
  title: string;
  content: Record<string, any>;
  updatedAt: string;
}

const PAGE_CONFIGS: Record<string, { label: string; description: string; fields: string[]; sections: Record<string, { label: string; template: Record<string, any> }> }> = {
  about: {
    label: 'About', description: 'Mission, vision, values, and timeline',
    fields: ['mission', 'vision'],
    sections: {
      values: { label: 'Values', template: { title: '', description: '' } },
      timeline: { label: 'Timeline', template: { year: '', event: '' } },
      banners: { label: 'Banner Images', template: { url: '', alt: '', caption: '' } },
    },
  },
  resources: {
    label: 'Resources', description: 'Downloads and videos',
    fields: [],
    sections: {
      downloads: { label: 'Downloads', template: { title: '', format: '', description: '', imageUrl: '', downloadUrl: '' } },
      videos: { label: 'Videos', template: { title: '' } },
      banners: { label: 'Banner Images', template: { url: '', alt: '', caption: '' } },
    },
  },
  courses: {
    label: 'Courses', description: 'Certifications and courses',
    fields: [],
    sections: {
      courses: { label: 'Courses', template: { title: '', level: '', duration: '', price: '', description: '', imageUrl: '' } },
      banners: { label: 'Banner Images', template: { url: '', alt: '', caption: '' } },
    },
  },
  events: {
    label: 'Events', description: 'Upcoming and past events',
    fields: [],
    sections: {
      upcomingEvents: { label: 'Upcoming Events', template: { title: '', date: '', time: '', format: '', description: '', imageUrl: '' } },
      pastEvents: { label: 'Past Events', template: { title: '', date: '', summary: '', imageUrl: '' } },
      banners: { label: 'Banner Images', template: { url: '', alt: '', caption: '' } },
    },
  },
  news: {
    label: 'News', description: 'Articles and featured content',
    fields: [],
    sections: {
      articles: { label: 'Articles', template: { title: '', category: '', excerpt: '', author: '', date: '', imageUrl: '' } },
      banners: { label: 'Banner Images', template: { url: '', alt: '', caption: '' } },
    },
  },
  volunteers: {
    label: 'Volunteers', description: 'Volunteer team members',
    fields: [],
    sections: {
      members: { label: 'Volunteers', template: { name: '', role: '', bio: '', expertise: [], location: '', imageUrl: '' } },
      banners: { label: 'Banner Images', template: { url: '', alt: '', caption: '' } },
    },
  },
  contact: {
    label: 'Contact', description: 'Phone, email, address, social links, and FAQs',
    fields: ['hero'],
    sections: {
      faqs: { label: 'FAQs', template: { question: '', answer: '' } },
    },
  },
};

type View = 'list' | 'page' | 'edit-item' | 'add-item';

export function ContentManager() {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState<Record<string, any>>({});
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const pendingDelete = useRef<{ section: string; index: number } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/content');
      if (!res.ok) throw new Error('Failed to load pages');
      setPages(await res.json());
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to load content pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPages(); }, []);

  const openPage = async (slug: string) => {
    try {
      const res = await fetch(`/api/content/${slug}`);
      if (!res.ok) throw new Error('Failed to load page');
      const data = await res.json();
      setSelectedSlug(slug);
      setEditTitle(data.title);
      setEditContent(typeof data.content === 'string' ? JSON.parse(data.content) : data.content);
      setView('page');
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const savePage = async () => {
    if (!selectedSlug) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/content/${selectedSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      showFeedback('success', 'Page saved successfully');
      await fetchPages();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: any) => {
    setEditContent((prev) => ({ ...prev, [key]: value }));
  };

  const openAddItem = (sectionKey: string) => {
    const config = PAGE_CONFIGS[selectedSlug!];
    const template = config?.sections[sectionKey]?.template || {};
    setActiveSection(sectionKey);
    setEditingIndex(null);
    setItemForm({ ...template });
    setView('add-item');
  };

  const openEditItem = (sectionKey: string, index: number) => {
    const arr = Array.isArray(editContent[sectionKey]) ? editContent[sectionKey] : [];
    setActiveSection(sectionKey);
    setEditingIndex(index);
    setItemForm({ ...arr[index] });
    setView('edit-item');
  };

  const saveItem = () => {
    if (!activeSection) return;
    setEditContent((prev) => {
      const arr = Array.isArray(prev[activeSection]) ? [...prev[activeSection]] : [];
      if (editingIndex !== null) {
        arr[editingIndex] = { ...itemForm };
      } else {
        arr.push({ ...itemForm, id: Date.now().toString() });
      }
      return { ...prev, [activeSection]: arr };
    });
    showFeedback('success', editingIndex !== null ? 'Item updated' : 'Item added');
    setView('page');
    setActiveSection(null);
    setEditingIndex(null);
  };

  const confirmDelete = (sectionKey: string, index: number) => {
    pendingDelete.current = { section: sectionKey, index };
    setShowDeleteModal(true);
  };

  const executeDelete = () => {
    const target = pendingDelete.current;
    if (!target) return;
    const { section, index } = target;
    setEditContent((prev) => {
      const arr = Array.isArray(prev[section]) ? [...prev[section]] : [];
      const newArr = [...arr];
      newArr.splice(index, 1);
      return { ...prev, [section]: newArr };
    });
    pendingDelete.current = null;
    setShowDeleteModal(false);
    showFeedback('success', 'Item deleted — click Save Page to keep changes');
  };

  const cancelDelete = () => {
    pendingDelete.current = null;
    setShowDeleteModal(false);
  };

  const getItemTitle = (item: any): string => {
    if (typeof item === 'string') return item;
    return item.title || item.name || item.year || item.event || 'Untitled';
  };

  const renderEditForm = () => {
    if (!activeSection) return null;
    const config = PAGE_CONFIGS[selectedSlug!];
    const sectionConfig = config?.sections[activeSection];
    if (!sectionConfig) return null;
    const fields = Object.keys(sectionConfig.template).filter((k) => k !== 'id');

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setView('page'); setActiveSection(null); setEditingIndex(null); }}>
            <ArrowLeft className="size-4 mr-1" /> Back
          </Button>
          <h2 className="text-2xl font-bold">{editingIndex !== null ? 'Edit' : 'Add'} {sectionConfig.label.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())}</h2>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            {fields.map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium mb-1 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                {field === 'bio' || field === 'description' || field === 'summary' || field === 'excerpt' || field === 'event' ? (
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[100px]"
                    value={itemForm[field] || ''}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, [field]: e.target.value }))}
                  />
                ) : field === 'expertise' ? (
                  <Input
                    value={Array.isArray(itemForm[field]) ? itemForm[field].join(', ') : ''}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, [field]: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) }))}
                    placeholder="Comma separated values"
                  />
                ) : (
                  <Input value={itemForm[field] || ''} onChange={(e) => setItemForm((prev) => ({ ...prev, [field]: e.target.value }))} />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => { setView('page'); setActiveSection(null); setEditingIndex(null); }}>Cancel</Button>
              <Button onClick={saveItem}>{editingIndex !== null ? 'Save Changes' : 'Add Item'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div><h2 className="text-2xl font-bold">Content Manager</h2><p className="text-muted-foreground">Manage public page content</p></div>
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">Loading pages...</div>
      </div>
    );
  }

  if (view === 'edit-item' || view === 'add-item') {
    return (
      <div className="space-y-4">
        {feedback && (
          <div className={`rounded-lg p-4 flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <AlertCircle className={`size-5 ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
            <p className={`text-sm font-medium ${feedback.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{feedback.message}</p>
          </div>
        )}
        {renderEditForm()}
      </div>
    );
  }

  if (view === 'page' && selectedSlug) {
    const config = PAGE_CONFIGS[selectedSlug];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setView('list'); setSelectedSlug(null); }}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{config?.label || selectedSlug}</h2>
              <p className="text-muted-foreground">{config?.description}</p>
            </div>
          </div>
          <Button onClick={savePage} disabled={saving}>
            <Save className="size-4 mr-2" />
            {saving ? 'Saving...' : 'Save Page'}
          </Button>
        </div>

        {feedback && (
          <div className={`rounded-lg p-4 flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <AlertCircle className={`size-5 ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
            <p className={`text-sm font-medium ${feedback.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{feedback.message}</p>
          </div>
        )}

        <Card>
          <CardContent className="pt-6">
            <label className="block text-sm font-medium mb-1">Page Title</label>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </CardContent>
        </Card>

        {editContent.hero && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hero Section</h3>
              <Input placeholder="Hero title" value={editContent.hero.title || ''} onChange={(e) => updateField('hero', { ...editContent.hero, title: e.target.value })} />
              <Input placeholder="Hero subtitle" value={editContent.hero.subtitle || ''} onChange={(e) => updateField('hero', { ...editContent.hero, subtitle: e.target.value })} />
            </CardContent>
          </Card>
        )}

        {config?.fields.map((field) => {
          if (field === 'hero' && selectedSlug === 'contact') {
            const hero = editContent.hero || {};
            return (
              <Card key={field}>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hero Section</h3>
                  <div>
                    <label className="block text-xs font-medium mb-1">Title</label>
                    <Input value={hero.title || ''} onChange={(e) => updateField('hero', { ...hero, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Subtitle</label>
                    <Input value={hero.subtitle || ''} onChange={(e) => updateField('hero', { ...hero, subtitle: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Description</label>
                    <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px]" value={hero.description || ''} onChange={(e) => updateField('hero', { ...hero, description: e.target.value })} />
                  </div>
                </CardContent>
              </Card>
            );
          }
          if (field === 'hero') {
            return (
              <Card key={field}>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hero Section</h3>
                  <Input placeholder="Hero title" value={editContent.hero?.title || ''} onChange={(e) => updateField('hero', { ...editContent.hero, title: e.target.value })} />
                  <Input placeholder="Hero subtitle" value={editContent.hero?.subtitle || ''} onChange={(e) => updateField('hero', { ...editContent.hero, subtitle: e.target.value })} />
                </CardContent>
              </Card>
            );
          }
          return (
            <Card key={field}>
              <CardContent className="pt-6">
                <label className="block text-sm font-semibold uppercase tracking-wider text-muted-foreground capitalize mb-1">{field}</label>
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[100px]"
                  value={editContent[field] || ''}
                  onChange={(e) => updateField(field, e.target.value)}
                />
              </CardContent>
            </Card>
          );
        })}

        {selectedSlug === 'contact' && (
          <>
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Phone</h3>
                <div>
                  <label className="block text-xs font-medium mb-1">Phone Numbers (one per line)</label>
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    rows={2}
                    value={(editContent.phone?.numbers || []).join('\n')}
                    onChange={(e) => updateField('phone', { ...editContent.phone, numbers: e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean) })}
                  />
                </div>
                <Input
                  placeholder="Availability (e.g. Mon-Fri, 8 AM - 6 PM)"
                  value={editContent.phone?.availability || ''}
                  onChange={(e) => updateField('phone', { ...editContent.phone, availability: e.target.value })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Email</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">General</label>
                    <Input value={editContent.email?.general || ''} onChange={(e) => updateField('email', { ...editContent.email, general: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Reporting</label>
                    <Input value={editContent.email?.reporting || ''} onChange={(e) => updateField('email', { ...editContent.email, reporting: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Media</label>
                    <Input value={editContent.email?.media || ''} onChange={(e) => updateField('email', { ...editContent.email, media: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Address</h3>
                <Input placeholder="Organization" value={editContent.address?.organization || ''} onChange={(e) => updateField('address', { ...editContent.address, organization: e.target.value })} />
                <Input placeholder="P.O. Box" value={editContent.address?.poBox || ''} onChange={(e) => updateField('address', { ...editContent.address, poBox: e.target.value })} />
                <Input placeholder="City, Country" value={editContent.address?.city || ''} onChange={(e) => updateField('address', { ...editContent.address, city: e.target.value })} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Social Links</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">LinkedIn</label>
                    <Input value={editContent.social?.linkedin || ''} onChange={(e) => updateField('social', { ...editContent.social, linkedin: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Twitter/X</label>
                    <Input value={editContent.social?.twitter || ''} onChange={(e) => updateField('social', { ...editContent.social, twitter: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Facebook</label>
                    <Input value={editContent.social?.facebook || ''} onChange={(e) => updateField('social', { ...editContent.social, facebook: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">YouTube</label>
                    <Input value={editContent.social?.youtube || ''} onChange={(e) => updateField('social', { ...editContent.social, youtube: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Instagram</label>
                    <Input value={editContent.social?.instagram || ''} onChange={(e) => updateField('social', { ...editContent.social, instagram: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {config && Object.entries(config.sections).map(([sectionKey, sectionConfig]) => {
          const items = Array.isArray(editContent[sectionKey]) ? editContent[sectionKey] : [];
          return (
            <Card key={sectionKey}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{sectionConfig.label}</h3>
                    <p className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openAddItem(sectionKey)}>
                    <Plus className="size-3 mr-1" /> Add
                  </Button>
                </div>
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No items yet. Click &quot;Add&quot; to create one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-sm font-medium truncate">{getItemTitle(item)}</p>
                          {typeof item === 'object' && item !== null && (
                            <p className="text-xs text-muted-foreground truncate">
                              {Object.entries(item).filter(([k]) => k !== 'id' && k !== 'title' && k !== 'name').slice(0, 3).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(' | ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => openEditItem(sectionKey, idx)} className="text-[#2563EB] hover:text-[#2563EB]/80 hover:bg-[#2563EB]/10">
                            <Pencil className="size-3.5 mr-1" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => confirmDelete(sectionKey, idx)} className="text-destructive hover:text-destructive/80 hover:bg-destructive/10">
                            <Trash2 className="size-3.5 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <div className="flex justify-end gap-2 pt-2 pb-4">
          <Button variant="outline" onClick={() => { setView('list'); setSelectedSlug(null); }}>Cancel</Button>
          <Button onClick={savePage} disabled={saving}>
            <Save className="size-4 mr-2" />
            {saving ? 'Saving...' : 'Save Page'}
          </Button>
        </div>

        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={cancelDelete} />
            <div className="relative bg-card rounded-lg border border-destructive/30 shadow-xl w-full max-w-md p-6 space-y-4 z-10">
              <h2 className="text-lg font-semibold text-destructive">Delete Item</h2>
              <p className="text-sm text-muted-foreground">Are you sure? You must click &quot;Save Page&quot; after to keep this change.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={cancelDelete}>Cancel</Button>
                <Button variant="destructive" onClick={executeDelete}>Delete</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Content Manager</h2>
        <p className="text-muted-foreground">Manage content for public-facing pages</p>
      </div>
      {feedback && (
        <div className={`rounded-lg p-4 flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <AlertCircle className={`size-5 ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
          <p className={`text-sm font-medium ${feedback.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{feedback.message}</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(PAGE_CONFIGS).map(([slug, config]) => {
          const page = pages.find((p) => p.slug === slug);
          const content = page?.content || {};
          const itemCount = Object.keys(config.sections).reduce((sum, key) => sum + (Array.isArray(content[key]) ? content[key].length : 0), 0);
          return (
            <Card key={slug} className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => openPage(slug)}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10 ring-1 ring-[#2563EB]/20 group-hover:bg-[#2563EB]/15 transition-colors">
                    <FileText className="size-5 text-[#2563EB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{config.label}</h3>
                      <span className="inline-flex items-center rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-xs font-medium text-[#2563EB]">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                    {page && <p className="text-xs text-muted-foreground mt-2">Updated: {new Date(page.updatedAt).toLocaleDateString()}</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="size-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
