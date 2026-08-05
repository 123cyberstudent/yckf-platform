'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Receipt, Search, Loader2, RefreshCw } from 'lucide-react';

interface OrderItem {
  productType: string;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: string | null;
  createdAt: string;
  user: { id: number; email: string; fullName: string } | null;
  items: OrderItem[];
  source?: 'order' | 'subscription_payment';
}

const STATUS_OPTIONS = [
  'CREATED',
  'PENDING_PAYMENT',
  'PAID',
  'FULFILLED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
];

const statusStyles: Record<string, string> = {
  FULFILLED: 'bg-green-100 text-green-700',
  PAID: 'bg-blue-100 text-blue-700',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700',
  CREATED: 'bg-gray-100 text-gray-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  EXPIRED: 'bg-gray-100 text-gray-500',
  REFUNDED: 'bg-red-100 text-red-700',
  PARTIALLY_REFUNDED: 'bg-red-50 text-red-600',
};

const money = (minor: number, currency = 'GHS') =>
  `${currency} ${(minor / 100).toFixed(2)}`;

const orderTypeLabel = (t: string) =>
  t === 'COURSE' ? 'Course' : t === 'PREMIUM_SUBSCRIPTION' ? 'Subscription' : t === 'CREDIT_PACKAGE' ? 'Legacy credit' : 'Premium';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState<Order | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status && status !== 'ALL') params.set('status', status);
      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const runAction = async (order: Order, action: 'fulfill' | 'cancel' | 'refund') => {
    setActingOn(order.orderNumber);
    try {
      const res = await fetch(`/api/orders/${order.orderNumber}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || `Failed to ${action} order`);
        return;
      }
      toast.success(`Order ${action === 'fulfill' ? 'fulfilled' : action === 'cancel' ? 'cancelled' : 'refunded'}`);
      setSelected(null);
      fetchOrders();
    } catch {
      toast.error(`Failed to ${action} order`);
    } finally {
      setActingOn(null);
    }
  };

  // Subscription checkouts are verified/fulfilled by Paystack webhooks, not
  // the legacy order lifecycle, so admin actions only apply to real Orders.
  const isLegacyOrder = (o: Order) => o.source !== 'subscription_payment';
  const canFulfill = (o: Order) => isLegacyOrder(o) && ['PENDING_PAYMENT', 'CREATED', 'PAID'].includes(o.status);
  const canCancel = (o: Order) => isLegacyOrder(o) && ['PENDING_PAYMENT', 'CREATED', 'EXPIRED', 'FAILED'].includes(o.status);
  const canRefund = (o: Order) => isLegacyOrder(o) && ['PAID', 'FULFILLED'].includes(o.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Course and premium subscription purchases</p>
        </div>
        <Button variant="outline" onClick={fetchOrders}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-64">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search order number, email or name..."
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
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer" onClick={() => setSelected(order)}>
                    <TableCell>
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{order.orderNumber}</code>
                    </TableCell>
                    <TableCell>{orderTypeLabel(order.orderType)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.user ? (
                        <div className="flex flex-col">
                          <span>{order.user.fullName || order.user.email}</span>
                          <span className="text-xs">{order.user.email}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="max-w-48">
                      <div className="truncate">{order.items.map((i) => i.productName).join(', ')}</div>
                    </TableCell>
                    <TableCell className="font-semibold">{money(order.totalAmount, order.currency)}</TableCell>
                    <TableCell>
                      <Badge className={statusStyles[order.status] || 'bg-gray-100 text-gray-700'}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {order.paymentStatus ? order.paymentStatus.toLowerCase() : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order {selected?.orderNumber}</DialogTitle>
            <DialogDescription>Order details</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={statusStyles[selected.status] || 'bg-gray-100 text-gray-700'}>
                  {selected.status.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {orderTypeLabel(selected.orderType)} · {selected.currency}
                </span>
              </div>
              <div className="rounded-xl border p-4 space-y-2">
                {selected.items.map((item) => (
                  <div key={`${item.productType}-${item.productId}`} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-muted-foreground">x{item.quantity}</span>
                    <span className="font-semibold">{money(item.totalPrice, selected.currency)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{money(selected.subtotalAmount, selected.currency)}</span>
                </div>
                {selected.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-green-600">−{money(selected.discountAmount, selected.currency)}</span>
                  </div>
                )}
                {selected.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{money(selected.taxAmount, selected.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total</span>
                  <span>{money(selected.totalAmount, selected.currency)}</span>
                </div>
              </div>
              {selected.user && (
                <p className="text-xs text-muted-foreground">
                  Customer: {selected.user.fullName} ({selected.user.email})
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {canFulfill(selected) && (
                  <Button
                    size="sm"
                    onClick={() => runAction(selected, 'fulfill')}
                    disabled={actingOn === selected.orderNumber}
                  >
                    {actingOn === selected.orderNumber ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Fulfill order
                  </Button>
                )}
                {canCancel(selected) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runAction(selected, 'cancel')}
                    disabled={actingOn === selected.orderNumber}
                  >
                    Cancel order
                  </Button>
                )}
                {canRefund(selected) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => runAction(selected, 'refund')}
                    disabled={actingOn === selected.orderNumber}
                  >
                    Refund order
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
