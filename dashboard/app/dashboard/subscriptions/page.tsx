'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Crown, Plus, Search, Trash2, Pencil, Loader2, Star, Receipt, Gift } from 'lucide-react';

interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description: string | null;
  pricePesewas: number;
  currency: string;
  durationUnit: string;
  durationValue: number;
  active: boolean;
  displayOrder: number;
  createdAt?: string;
}

interface SubscriptionPayment {
  id: number;
  providerReference: string;
  amountGhs: number;
  currency: string;
  channel: string | null;
  status: string;
  referralCodeEntered: string | null;
  paidAt: string | null;
  createdAt: string;
  user: { id: number; email: string; fullName: string } | null;
  plan: { id: number; code: string; name: string } | null;
}

interface Referral {
  id: number;
  referralCode: string;
  rewardHours: number;
  status: string;
  rewardGrantedAt: string | null;
  rewardExpiresAt: string | null;
  createdAt: string;
  referrer: { id: number; email: string; fullName: string } | null;
  referred: { id: number; email: string; fullName: string } | null;
}

type Tab = 'plans' | 'payments' | 'referrals';

const emptyForm = {
  code: '',
  name: '',
  description: '',
  pricePesewas: '',
  durationUnit: 'MONTH',
  durationValue: '1',
  active: true,
  displayOrder: '0',
};

const statusStyles: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  REFUNDED: 'bg-red-100 text-red-700',
  REWARDED: 'bg-green-100 text-green-700',
  REVERSED: 'bg-red-100 text-red-700',
};

const ghc = (pesewas: number) => `GHS ${(pesewas / 100).toFixed(2)}`;

export default function SubscriptionsPage() {
  const [tab, setTab] = useState<Tab>('plans');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subscription-plans');
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await fetch(`/api/subscription-payments?${params.toString()}`);
      const data = await res.json();
      setPayments(data.payments || []);
    } catch {
      toast.error('Failed to load subscription payments');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/referrals?${params.toString()}`);
      const data = await res.json();
      setReferrals(data.referrals || []);
    } catch {
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (tab === 'plans') fetchPlans();
    if (tab === 'payments') fetchPayments();
    if (tab === 'referrals') fetchReferrals();
  }, [tab, fetchPlans, fetchPayments, fetchReferrals]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditing(plan);
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      pricePesewas: String(plan.pricePesewas),
      durationUnit: plan.durationUnit,
      durationValue: String(plan.durationValue),
      active: plan.active,
      displayOrder: String(plan.displayOrder),
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    const pricePesewas = Number(form.pricePesewas);
    if (!Number.isInteger(pricePesewas) || pricePesewas <= 0) {
      toast.error('Price (pesewas) must be a positive integer');
      return;
    }
    const durationValue = Number(form.durationValue);
    if (!Number.isInteger(durationValue) || durationValue < 1) {
      toast.error('Duration value must be a positive integer');
      return;
    }
    if (form.durationUnit !== 'MONTH' && form.durationUnit !== 'YEAR') {
      toast.error('Duration unit must be MONTH or YEAR');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        pricePesewas,
        durationUnit: form.durationUnit,
        durationValue,
        active: form.active,
        displayOrder: Number(form.displayOrder) || 0,
      };
      const url = editing ? `/api/subscription-plans/${encodeURIComponent(editing.code)}` : '/api/subscription-plans';
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.plan) {
        toast.success(editing ? 'Plan updated' : 'Plan created');
        setShowDialog(false);
        fetchPlans();
      } else {
        toast.error(data.error || 'Failed to save plan');
      }
    } catch {
      toast.error('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (plan: SubscriptionPlan) => {
    if (!window.confirm(`Deactivate plan "${plan.name}"? It will be hidden from checkout.`)) return;
    try {
      const res = await fetch(`/api/subscription-plans/${encodeURIComponent(plan.code)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Plan deactivated');
        fetchPlans();
      } else {
        toast.error(data.error || 'Failed to deactivate plan');
      }
    } catch {
      toast.error('Failed to deactivate plan');
    }
  };

  const formatDate = (v?: string | null) =>
    v ? new Date(v).toLocaleString() : '—';

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'plans', label: 'Plans', icon: Crown },
    { key: 'payments', label: 'Payments', icon: Receipt },
    { key: 'referrals', label: 'Referrals', icon: Gift },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">Premium plan catalogue, payments and referral rewards</p>
        </div>
        {tab === 'plans' && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Plan
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1 rounded-xl border bg-card p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === key ? 'bg-[#2563EB] text-white' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'plans' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plans..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No subscription plans found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.code}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{plan.name}</span>
                          <code className="text-xs text-muted-foreground">{plan.code}</code>
                          {plan.code === 'annual' && (
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          )}
                        </div>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground max-w-64 truncate">{plan.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {plan.durationValue} {plan.durationUnit.toLowerCase() === 'year' ? 'year(s)' : 'month(s)'}
                      </TableCell>
                      <TableCell className="font-semibold">{ghc(plan.pricePesewas)}</TableCell>
                      <TableCell>
                        <Badge variant={plan.active ? 'default' : 'secondary'}>
                          {plan.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeactivate(plan)} disabled={!plan.active}>
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
      )}

      {tab === 'payments' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex items-center gap-2 flex-1 min-w-64">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reference, email or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No subscription payments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <code className="text-xs">{p.providerReference}</code>
                        {p.referralCodeEntered && (
                          <p className="text-xs text-muted-foreground">ref {p.referralCodeEntered}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{p.user?.fullName || '—'}</span>
                        <p className="text-xs text-muted-foreground">{p.user?.email || ''}</p>
                      </TableCell>
                      <TableCell>{p.plan?.name || '—'}</TableCell>
                      <TableCell className="font-semibold">{ghc(p.amountGhs * 100)}</TableCell>
                      <TableCell className="text-xs">{p.channel || '—'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[p.status] || 'bg-gray-100 text-gray-700'}`}>
                          {p.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(p.paidAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'referrals' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search referral code, referrer or referred..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No referrals found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referred</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reward Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <code className="text-xs">{r.referralCode}</code>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{r.referrer?.fullName || '—'}</span>
                        <p className="text-xs text-muted-foreground">{r.referrer?.email || ''}</p>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{r.referred?.fullName || '—'}</span>
                        <p className="text-xs text-muted-foreground">{r.referred?.email || ''}</p>
                      </TableCell>
                      <TableCell>{r.rewardHours} hr(s)</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[r.status] || 'bg-gray-100 text-gray-700'}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(r.rewardExpiresAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) setShowDialog(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Plan' : 'New Subscription Plan'}</DialogTitle>
            <DialogDescription>
              Prices are set server-side. Enter the amount in GHS pesewas (e.g. 5000 = GHS 50.00).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. monthly"
                  disabled={!!editing}
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Monthly"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional short description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (pesewas)</Label>
                <Input
                  type="number"
                  value={form.pricePesewas}
                  onChange={(e) => setForm({ ...form, pricePesewas: e.target.value })}
                  placeholder="5000"
                />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration Unit</Label>
                <Select value={form.durationUnit} onValueChange={(v) => setForm({ ...form, durationUnit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTH">Months</SelectItem>
                    <SelectItem value="YEAR">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration Value</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.durationValue}
                  onChange={(e) => setForm({ ...form, durationValue: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Visible in checkout</p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
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
    </div>
  );
}
