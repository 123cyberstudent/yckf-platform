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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { isSuperAdmin } from '@/lib/permissions';
import {
  Ticket,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Ban,
  Copy,
  Share2,
  Loader2,
  Check,
} from 'lucide-react';

interface Coupon {
  id: number;
  code: string;
  description: string | null;
  discountPercent: number | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  _count?: { redemptions: number };
}

export default function CouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [createdCouponCode, setCreatedCouponCode] = useState<string | null>(null);
  const [copiedCreated, setCopiedCreated] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    discountPercent: '',
    maxUses: '',
    expiresAt: '',
  });

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/coupons?${params.toString()}`);
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    isSuperAdmin().then((allowed) => {
      if (!allowed) {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleCreate = async () => {
    if (!newCoupon.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCoupon.code.trim(),
          description: newCoupon.description.trim() || undefined,
          discountPercent: newCoupon.discountPercent ? Number(newCoupon.discountPercent) : undefined,
          maxUses: newCoupon.maxUses ? Number(newCoupon.maxUses) : undefined,
          expiresAt: newCoupon.expiresAt || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedCouponCode(data.coupon.code);
        setNewCoupon({ code: '', description: '', discountPercent: '', maxUses: '', expiresAt: '' });
        toast.success('Coupon created');
        fetchCoupons();
      } else {
        toast.error(data.error || 'Failed to create coupon');
      }
    } catch {
      toast.error('Failed to create coupon');
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (action: string, couponId: number, code: string) => {
    try {
      const res = await fetch('/api/coupons/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, couponId, code }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Coupon ${action}d`);
        fetchCoupons();
      } else {
        toast.error(data.error || `Failed to ${action} coupon`);
      }
    } catch {
      toast.error(`Failed to ${action} coupon`);
    }
  };

  const copyCode = async (code: string, id: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Coupon code copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareCoupon = async (coupon: Coupon) => {
    const text = `Use coupon code *${coupon.code}* for premium access on YCKF${coupon.description ? ` — ${coupon.description}` : ''}${coupon.expiresAt ? ` (expires ${new Date(coupon.expiresAt).toLocaleDateString()})` : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'YCKF Coupon Code', text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Coupon details copied to clipboard');
    }
  };

  const copyCreatedCode = async () => {
    if (!createdCouponCode) return;
    await navigator.clipboard.writeText(createdCouponCode);
    setCopiedCreated(true);
    toast.success('Coupon code copied');
    setTimeout(() => setCopiedCreated(false), 2000);
  };

  const shareCreatedCode = async () => {
    if (!createdCouponCode) return;
    const text = `Use coupon code *${createdCouponCode}* for premium access on YCKF`;
    if (navigator.share) {
      try { await navigator.share({ title: 'YCKF Coupon Code', text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Coupon details copied to clipboard');
    }
  };

  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    setCreatedCouponCode(null);
    setCopiedCreated(false);
  };

  const generateCode = () => {
    const r = () => Math.random().toString(36).substring(2, 7).toUpperCase();
    setNewCoupon((prev) => ({ ...prev, code: `YCKF-${r()}-${r()}` }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-muted-foreground">Manage coupon codes for premium access</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Coupon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search coupons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No coupons found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{coupon.code}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCode(coupon.code, coupon.id)}
                          title="Copy code"
                        >
                          {copiedId === coupon.id ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => shareCoupon(coupon)}
                          title="Share coupon"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{coupon.description || '—'}</TableCell>
                    <TableCell>{coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}</TableCell>
                    <TableCell>
                      <Badge variant={coupon.isActive ? 'default' : 'secondary'}>
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {coupon.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction('deactivate', coupon.id, coupon.code)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction('reactivate', coupon.id, coupon.code)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction('delete', coupon.id, coupon.code)}
                        >
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

      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) closeCreateDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createdCouponCode ? 'Coupon Created' : 'Create Coupon'}</DialogTitle>
            <DialogDescription>
              {createdCouponCode
                ? 'Your coupon code is ready. Copy or share it with users.'
                : 'Generate a new coupon code for premium access'}
            </DialogDescription>
          </DialogHeader>

          {createdCouponCode ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-sm text-green-700 mb-2 font-medium">Your new coupon code</p>
                <code className="text-2xl font-mono font-bold text-green-800 tracking-wider">{createdCouponCode}</code>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyCreatedCode} variant="outline" className="flex-1">
                  {copiedCreated ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copiedCreated ? 'Copied' : 'Copy Code'}
                </Button>
                <Button onClick={shareCreatedCode} variant="outline" className="flex-1">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={closeCreateDialog}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    placeholder="YCKF-XXXXX-XXXXX"
                    className="font-mono"
                  />
                  <Button variant="outline" onClick={generateCode} type="button">
                    Generate
                  </Button>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={newCoupon.description}
                  onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                  placeholder="e.g. 24-hour premium access"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Uses</Label>
                  <Input
                    type="number"
                    value={newCoupon.maxUses}
                    onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <Label>Expires At</Label>
                  <Input
                    type="datetime-local"
                    value={newCoupon.expiresAt}
                    onChange={(e) => setNewCoupon({ ...newCoupon, expiresAt: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeCreateDialog}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
