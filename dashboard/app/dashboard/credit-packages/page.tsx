'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Coins, Plus, Search, Trash2, Pencil, Loader2, Star } from 'lucide-react';

interface CreditPackage {
  id: number;
  name: string;
  description: string | null;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
  priceGhs: number;
  currency: string;
  active: boolean;
  featured: boolean;
  displayOrder: number;
  promotionLabel: string | null;
  startAt: string | null;
  endAt: string | null;
}

const emptyForm = {
  name: '',
  description: '',
  baseCredits: '',
  bonusCredits: '0',
  priceGhs: '',
  active: true,
  featured: false,
  displayOrder: '0',
  promotionLabel: '',
  startAt: '',
  endAt: '',
};

export default function CreditPackagesPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<CreditPackage | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credit-packages?includeInactive=1');
      const data = await res.json();
      setPackages(data.packages || []);
    } catch {
      toast.error('Failed to load credit packages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (pkg: CreditPackage) => {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description || '',
      baseCredits: String(pkg.baseCredits),
      bonusCredits: String(pkg.bonusCredits),
      priceGhs: String(pkg.priceGhs),
      active: pkg.active,
      featured: pkg.featured,
      displayOrder: String(pkg.displayOrder),
      promotionLabel: pkg.promotionLabel || '',
      startAt: pkg.startAt ? pkg.startAt.slice(0, 16) : '',
      endAt: pkg.endAt ? pkg.endAt.slice(0, 16) : '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    const baseCredits = Number(form.baseCredits);
    const priceGhs = Number(form.priceGhs);
    if (!Number.isInteger(baseCredits) || baseCredits < 0) {
      toast.error('Base credits must be a non-negative integer');
      return;
    }
    if (!Number.isFinite(priceGhs) || priceGhs <= 0) {
      toast.error('Price must be a positive amount');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        baseCredits,
        bonusCredits: Number(form.bonusCredits) || 0,
        priceGhs,
        active: form.active,
        featured: form.featured,
        displayOrder: Number(form.displayOrder) || 0,
        promotionLabel: form.promotionLabel.trim() || undefined,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
      };
      const url = editing ? `/api/credit-packages/${editing.id}` : '/api/credit-packages';
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.package) {
        toast.success(editing ? 'Package updated' : 'Package created');
        setShowDialog(false);
        fetchPackages();
      } else {
        toast.error(data.error || 'Failed to save package');
      }
    } catch {
      toast.error('Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg: CreditPackage) => {
    if (!window.confirm(`Delete package "${pkg.name}"? This only works if it has not been purchased.`)) return;
    try {
      const res = await fetch(`/api/credit-packages/${pkg.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.deleted) {
        toast.success('Package deleted');
        fetchPackages();
      } else {
        toast.error(data.error || 'Failed to delete package');
      }
    } catch {
      toast.error('Failed to delete package');
    }
  };

  const filtered = packages.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credit Packages</h1>
          <p className="text-muted-foreground">Wallet top-up packages users can buy</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Package
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search packages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No credit packages found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Promo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pkg.name}</span>
                        {pkg.featured && (
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground max-w-48 truncate">{pkg.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{pkg.totalCredits.toLocaleString()}</span>
                      {pkg.bonusCredits > 0 && (
                        <span className="text-xs text-green-600 block">+{pkg.bonusCredits} bonus</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      GHS {pkg.priceGhs.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {pkg.promotionLabel || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={pkg.active ? 'default' : 'secondary'}>
                        {pkg.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(pkg)}>
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

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) setShowDialog(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Package' : 'New Credit Package'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the credit package details' : 'Create a wallet top-up package'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Starter"
              />
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
                <Label>Base Credits</Label>
                <Input
                  type="number"
                  value={form.baseCredits}
                  onChange={(e) => setForm({ ...form, baseCredits: e.target.value })}
                  placeholder="50"
                />
              </div>
              <div>
                <Label>Bonus Credits</Label>
                <Input
                  type="number"
                  value={form.bonusCredits}
                  onChange={(e) => setForm({ ...form, bonusCredits: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label>Price (GHS)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.priceGhs}
                onChange={(e) => setForm({ ...form, priceGhs: e.target.value })}
                placeholder="5.00"
              />
            </div>
            <div>
              <Label>Promotion Label</Label>
              <Input
                value={form.promotionLabel}
                onChange={(e) => setForm({ ...form, promotionLabel: e.target.value })}
                placeholder="e.g. Limited time offer"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                />
              </div>
              <div>
                <Label>Valid From</Label>
                <Input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Valid Until</Label>
              <Input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Visible to users in the app</p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <Label>Featured</Label>
                <p className="text-xs text-muted-foreground">Shown as &quot;Most Popular&quot;</p>
              </div>
              <Switch
                checked={form.featured}
                onCheckedChange={(v) => setForm({ ...form, featured: v })}
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
