'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Megaphone,
  Plus,
  Search,
  Trash2,
  Pencil,
  RefreshCw,
  Loader2,
  Play,
  Pause,
  Ticket,
  Copy,
} from 'lucide-react';

interface PromoCode {
  id: number;
  code: string;
  type: string;
  status: string;
  useCount: number;
}

interface Promotion {
  id: number;
  internalName: string;
  publicTitle: string | null;
  publicDescription: string | null;
  promotionType: string;
  status: string;
  codeRequired: boolean;
  bonusCredits: number;
  discountType: string | null;
  discountValue: number;
  minimumPurchaseAmountGhs: number;
  eligibleProductType: string | null;
  eligibleUserSegment: string | null;
  firstPurchaseOnly: boolean;
  perUserRedemptionLimit: number;
  totalRedemptionLimit: number | null;
  redemptionCount: number;
  stackable: boolean;
  priority: number;
  bannerEnabled: boolean;
  modalEnabled: boolean;
  startAt: string | null;
  endAt: string | null;
  promoCodeCount: number;
}

const PROMOTION_TYPES = [
  'BONUS_CREDITS',
  'PERCENTAGE_DISCOUNT',
  'FIXED_DISCOUNT',
  'FREE_COURSE',
  'COURSE_BUNDLE',
  'SIGNUP_REWARD',
  'REFERRAL_REWARD',
];
const STATUSES = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'];

const typeLabel: Record<string, string> = {
  BONUS_CREDITS: 'Bonus credits',
  PERCENTAGE_DISCOUNT: 'Percentage discount',
  FIXED_DISCOUNT: 'Fixed discount',
  FREE_COURSE: 'Free course',
  COURSE_BUNDLE: 'Course bundle',
  SIGNUP_REWARD: 'Sign-up reward',
  REFERRAL_REWARD: 'Referral reward',
};

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  PAUSED: 'bg-amber-100 text-amber-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

const emptyForm = {
  internalName: '',
  publicTitle: '',
  publicDescription: '',
  promotionType: 'BONUS_CREDITS',
  status: 'DRAFT',
  codeRequired: false,
  bonusCredits: '0',
  discountType: '',
  discountValue: '0',
  minimumPurchaseAmountGhs: '0',
  eligibleProductType: '',
  eligibleUserSegment: '',
  firstPurchaseOnly: false,
  perUserRedemptionLimit: '1',
  totalRedemptionLimit: '',
  stackable: false,
  priority: '0',
  bannerEnabled: false,
  modalEnabled: false,
  startAt: '',
  endAt: '',
  codesText: '',
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [codesFor, setCodesFor] = useState<Promotion | null>(null);
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [newCodesText, setNewCodesText] = useState('');
  const [addingCodes, setAddingCodes] = useState(false);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status && status !== 'ALL') params.set('status', status);
      const res = await fetch(`/api/promotions?${params.toString()}`);
      const data = await res.json();
      setPromotions(data.promotions || []);
    } catch {
      toast.error('Failed to load promotions');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (promo: Promotion) => {
    setEditing(promo);
    setForm({
      internalName: promo.internalName,
      publicTitle: promo.publicTitle || '',
      publicDescription: promo.publicDescription || '',
      promotionType: promo.promotionType,
      status: promo.status,
      codeRequired: promo.codeRequired,
      bonusCredits: String(promo.bonusCredits),
      discountType: promo.discountType || '',
      discountValue: String(promo.discountValue),
      minimumPurchaseAmountGhs: String(promo.minimumPurchaseAmountGhs),
      eligibleProductType: promo.eligibleProductType || '',
      eligibleUserSegment: promo.eligibleUserSegment || '',
      firstPurchaseOnly: promo.firstPurchaseOnly,
      perUserRedemptionLimit: String(promo.perUserRedemptionLimit),
      totalRedemptionLimit: promo.totalRedemptionLimit ? String(promo.totalRedemptionLimit) : '',
      stackable: promo.stackable,
      priority: String(promo.priority),
      bannerEnabled: promo.bannerEnabled,
      modalEnabled: promo.modalEnabled,
      startAt: promo.startAt ? promo.startAt.slice(0, 16) : '',
      endAt: promo.endAt ? promo.endAt.slice(0, 16) : '',
      codesText: '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.internalName.trim()) {
      toast.error('Internal name is required');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        internalName: form.internalName.trim(),
        publicTitle: form.publicTitle.trim() || undefined,
        publicDescription: form.publicDescription.trim() || undefined,
        promotionType: form.promotionType,
        status: form.status,
        codeRequired: form.codeRequired,
        bonusCredits: Number(form.bonusCredits) || 0,
        discountType: form.discountType || undefined,
        discountValue: Number(form.discountValue) || 0,
        minimumPurchaseAmountGhs: Number(form.minimumPurchaseAmountGhs) || 0,
        eligibleProductType: form.eligibleProductType || undefined,
        eligibleUserSegment: form.eligibleUserSegment || undefined,
        firstPurchaseOnly: form.firstPurchaseOnly,
        perUserRedemptionLimit: Number(form.perUserRedemptionLimit) || 1,
        totalRedemptionLimit: form.totalRedemptionLimit ? Number(form.totalRedemptionLimit) : undefined,
        stackable: form.stackable,
        priority: Number(form.priority) || 0,
        bannerEnabled: form.bannerEnabled,
        modalEnabled: form.modalEnabled,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
      };
      if (!editing) {
        const codes = form.codesText
          .split(/[\n,]/)
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean);
        if (codes.length) payload.codes = [...new Set(codes)];
      }

      const url = editing ? `/api/promotions/${editing.id}` : '/api/promotions';
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.promotion) {
        toast.success(editing ? 'Promotion updated' : 'Promotion created');
        setShowDialog(false);
        fetchPromotions();
      } else {
        toast.error(data.error || 'Failed to save promotion');
      }
    } catch {
      toast.error('Failed to save promotion');
    } finally {
      setSaving(false);
    }
  };

  const setStatusAction = async (promo: Promotion, action: 'activate' | 'pause') => {
    try {
      const res = await fetch(`/api/promotions/${promo.id}/${action}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.promotion) {
        toast.success(`Promotion ${action === 'activate' ? 'activated' : 'paused'}`);
        fetchPromotions();
      } else {
        toast.error(data.error || 'Failed to update promotion');
      }
    } catch {
      toast.error('Failed to update promotion');
    }
  };

  const handleDelete = async (promo: Promotion) => {
    if (!window.confirm(`Delete promotion "${promo.internalName}"? This only works if it has no redemptions or codes.`)) return;
    try {
      const res = await fetch(`/api/promotions/${promo.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.deleted) {
        toast.success('Promotion deleted');
        fetchPromotions();
      } else {
        toast.error(data.error || 'Failed to delete promotion');
      }
    } catch {
      toast.error('Failed to delete promotion');
    }
  };

  const openCodes = async (promo: Promotion) => {
    setCodesFor(promo);
    setCodes([]);
    setNewCodesText('');
    setCodesLoading(true);
    try {
      const res = await fetch(`/api/promotions/${promo.id}/codes`);
      const data = await res.json();
      setCodes(data.codes || []);
    } catch {
      toast.error('Failed to load promo codes');
    } finally {
      setCodesLoading(false);
    }
  };

  const addCodes = async () => {
    const list = newCodesText
      .split(/[\n,]/)
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (!list.length || !codesFor) {
      toast.error('Enter at least one code');
      return;
    }
    setAddingCodes(true);
    try {
      const res = await fetch(`/api/promotions/${codesFor.id}/codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: [...new Set(list)] }),
      });
      const data = await res.json();
      if (res.ok && data.codes) {
        toast.success('Promo codes added');
        setNewCodesText('');
        setCodes(data.codes || []);
      } else {
        toast.error(data.error || 'Failed to add promo codes');
      }
    } catch {
      toast.error('Failed to add promo codes');
    } finally {
      setAddingCodes(false);
    }
  };

  const deleteCode = async (codeId: number, code: string) => {
    if (!codesFor) return;
    if (!window.confirm(`Delete promo code "${code}"? This only works if it is unused.`)) return;
    try {
      const res = await fetch(`/api/promotions/${codesFor.id}/codes/${codeId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.deleted) {
        toast.success('Promo code deleted');
        setCodes((prev) => prev.filter((c) => c.id !== codeId));
      } else {
        toast.error(data.error || 'Failed to delete promo code');
      }
    } catch {
      toast.error('Failed to delete promo code');
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success('Code copied');
  };

  const filtered = promotions.filter((p) =>
    p.internalName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
          <p className="text-muted-foreground">Discounts, bonuses and limited-time offers</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Promotion
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-64">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search promotions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchPromotions}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No promotions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promotion</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Codes</TableHead>
                  <TableHead>Redeemed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div className="font-medium">{promo.internalName}</div>
                      {promo.publicTitle && (
                        <p className="text-xs text-muted-foreground">{promo.publicTitle}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {promo.codeRequired ? 'Code required' : 'Auto-applied'}
                        {promo.eligibleProductType ? ` · ${promo.eligibleProductType.toLowerCase()}` : ''}
                      </p>
                    </TableCell>
                    <TableCell>{typeLabel[promo.promotionType] || promo.promotionType}</TableCell>
                    <TableCell>
                      {promo.promotionType === 'PERCENTAGE_DISCOUNT' && `${promo.discountValue}%`}
                      {promo.promotionType === 'FIXED_DISCOUNT' && `GHS ${(promo.discountValue / 100).toFixed(2)}`}
                      {promo.promotionType === 'BONUS_CREDITS' && `${promo.bonusCredits} credits`}
                      {!['PERCENTAGE_DISCOUNT', 'FIXED_DISCOUNT', 'BONUS_CREDITS'].includes(promo.promotionType) && '—'}
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => openCodes(promo)}
                      >
                        {promo.promoCodeCount} code(s)
                      </button>
                    </TableCell>
                    <TableCell>{promo.redemptionCount}</TableCell>
                    <TableCell>
                      <Badge className={statusStyles[promo.status] || 'bg-gray-100 text-gray-700'}>
                        {promo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {promo.status === 'PAUSED' || promo.status === 'DRAFT' ? (
                          <Button variant="ghost" size="sm" onClick={() => setStatusAction(promo, 'activate')}>
                            <Play className="h-4 w-4 text-green-600" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => setStatusAction(promo, 'pause')}>
                            <Pause className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(promo)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(promo)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Create/Edit dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) setShowDialog(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Promotion' : 'New Promotion'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the promotion settings' : 'Create a promotion for courses and premium subscriptions'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Internal Name</Label>
                <Input
                  value={form.internalName}
                  onChange={(e) => setForm({ ...form, internalName: e.target.value })}
                  placeholder="e.g. Q3 Starter Bonanza"
                />
              </div>
              <div>
                <Label>Public Title</Label>
                <Input
                  value={form.publicTitle}
                  onChange={(e) => setForm({ ...form, publicTitle: e.target.value })}
                  placeholder="Shown to users"
                />
              </div>
            </div>
            <div>
              <Label>Public Description</Label>
              <Input
                value={form.publicDescription}
                onChange={(e) => setForm({ ...form, publicDescription: e.target.value })}
                placeholder="Shown on banners/modals"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Promotion Type</Label>
                <Select value={form.promotionType} onValueChange={(v) => setForm({ ...form, promotionType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROMOTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{typeLabel[t] || t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Bonus Credits</Label>
                <Input
                  type="number"
                  value={form.bonusCredits}
                  onChange={(e) => setForm({ ...form, bonusCredits: e.target.value })}
                />
              </div>
              <div>
                <Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="PERCENT">Percent</SelectItem>
                    <SelectItem value="FIXED">Fixed (GHS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  placeholder="e.g. 10 for 10%"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Min Purchase (GHS)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.minimumPurchaseAmountGhs}
                  onChange={(e) => setForm({ ...form, minimumPurchaseAmountGhs: e.target.value })}
                />
              </div>
              <div>
                <Label>Eligible Product</Label>
                <Select value={form.eligibleProductType} onValueChange={(v) => setForm({ ...form, eligibleProductType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="COURSE">Course</SelectItem>
                    <SelectItem value="CREDIT_PACKAGE">Credit package</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>User Segment</Label>
                <Select value={form.eligibleUserSegment} onValueChange={(v) => setForm({ ...form, eligibleUserSegment: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Everyone</SelectItem>
                    <SelectItem value="NEW">New users</SelectItem>
                    <SelectItem value="EXISTING">Existing users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Per-user limit</Label>
                <Input
                  type="number"
                  value={form.perUserRedemptionLimit}
                  onChange={(e) => setForm({ ...form, perUserRedemptionLimit: e.target.value })}
                />
              </div>
              <div>
                <Label>Total limit</Label>
                <Input
                  type="number"
                  value={form.totalRedemptionLimit}
                  onChange={(e) => setForm({ ...form, totalRedemptionLimit: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Starts At</Label>
                <Input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                />
              </div>
              <div>
                <Label>Ends At</Label>
                <Input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-xl border p-3">
                <Label>Code required</Label>
                <Switch checked={form.codeRequired} onCheckedChange={(v) => setForm({ ...form, codeRequired: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <Label>First purchase only</Label>
                <Switch checked={form.firstPurchaseOnly} onCheckedChange={(v) => setForm({ ...form, firstPurchaseOnly: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <Label>Stackable</Label>
                <Switch checked={form.stackable} onCheckedChange={(v) => setForm({ ...form, stackable: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <Label>Show banner</Label>
                <Switch checked={form.bannerEnabled} onCheckedChange={(v) => setForm({ ...form, bannerEnabled: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <Label>Show modal</Label>
                <Switch checked={form.modalEnabled} onCheckedChange={(v) => setForm({ ...form, modalEnabled: v })} />
              </div>
            </div>
            {!editing && (
              <div>
                <Label>Promo codes (comma or newline separated)</Label>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={form.codesText}
                  onChange={(e) => setForm({ ...form, codesText: e.target.value })}
                  placeholder="e.g. SUMMER50, EARLYBIRD"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promo codes dialog */}
      <Dialog open={!!codesFor} onOpenChange={(open) => { if (!open) setCodesFor(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Promo Codes · {codesFor?.internalName}</DialogTitle>
            <DialogDescription>Add or remove codes for this promotion</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Add codes</Label>
              <div className="flex gap-2">
                <textarea
                  className="min-h-16 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={newCodesText}
                  onChange={(e) => setNewCodesText(e.target.value)}
                  placeholder="NEWCODE1, NEWCODE2"
                />
                <Button onClick={addCodes} disabled={addingCodes} className="self-start">
                  {addingCodes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {codesLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : codes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Ticket className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No promo codes yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {codes.map((code) => (
                  <div key={code.id} className="flex items-center justify-between rounded-lg border p-2.5">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono">{code.code}</code>
                      <Badge variant={code.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {code.status.toLowerCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{code.useCount} uses</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => copyCode(code.code)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteCode(code.id, code.code)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
