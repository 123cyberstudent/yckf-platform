'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Crown, Loader2, CheckCircle2, Copy, Sparkles, X, ShieldCheck, Gift } from 'lucide-react';
import { getRoleFromCookie } from '@/lib/permissions';

interface Plan {
  id: number;
  code: string;
  name: string;
  description: string | null;
  priceGhs: number;
  currency: string;
  durationUnit: string;
  durationValue: number;
}

interface SubscriptionStatus {
  isPremium: boolean;
  status: string;
  premiumStartsAt: string | null;
  premiumExpiresAt: string | null;
  plan: { id: number; code: string; name: string; expiresAt: string; subscriptionStatus: string } | null;
  referralCode: string | null;
  referredByUserId: number | null;
}

interface Promo {
  key: string;
  title: string;
  message: string;
  ctaLabel: string;
  placement: 'signup' | 'subscriptions';
  kind: 'signup_trial' | 'first_subscription_bonus';
  durationHours: number;
}

function formatDate(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleString();
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [promo, setPromo] = useState<{ show: boolean; promo?: Promo; reason?: string }>({ show: false });
  const [promoPlacement, setPromoPlacement] = useState<'signup' | 'subscriptions'>('signup');
  const [promoDismissed, setPromoDismissed] = useState(false);

  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralState, setReferralState] = useState<{ checked: boolean; valid: boolean; ownerName?: string; message?: string }>({ checked: false, valid: false });
  const [initializing, setInitializing] = useState(false);

  const impressionTracked = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/subscriptions/plans');
        const data = await res.json();
        setPlans(data.plans || []);
      } catch {
        toast.error('Failed to load subscription plans');
      } finally {
        setLoadingPlans(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const role = await getRoleFromCookie();
      const isAuth = Boolean(role);
      setLoggedIn(isAuth);
      setAuthLoading(false);

      if (isAuth) {
        try {
          const res = await fetch('/api/subscriptions/status');
          if (res.ok) {
            const data = await res.json();
            setStatus(data);
          }
        } catch {
          /* ignore */
        }
        const promoRes = await fetch('/api/promotions/eligible?placement=subscriptions&platform=WEB');
        const promoData = await promoRes.json();
        setPromoPlacement('subscriptions');
        setPromo({ show: Boolean(promoData.show), promo: promoData.promo, reason: promoData.reason });
      } else {
        const promoRes = await fetch('/api/promotions/eligible?placement=signup&platform=WEB');
        const promoData = await promoRes.json();
        setPromoPlacement('signup');
        setPromo({ show: Boolean(promoData.show), promo: promoData.promo, reason: promoData.reason });
      }
    })();
  }, []);

  useEffect(() => {
    if (promo.show && promo.promo && loggedIn && impressionTracked.current !== promo.promo.key) {
      impressionTracked.current = promo.promo.key;
      fetch('/api/promotions/eligible/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoKey: promo.promo.key, placement: promoPlacement, action: 'impression', platform: 'WEB' }),
      }).catch(() => undefined);
    }
  }, [promo, loggedIn, promoPlacement]);

  const dismissPromo = useCallback(() => {
    setPromoDismissed(true);
    if (promo.promo) {
      fetch('/api/promotions/eligible/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoKey: promo.promo.key, placement: promoPlacement, action: 'dismiss', platform: 'WEB' }),
      }).catch(() => undefined);
    }
  }, [promo, promoPlacement]);

  const handleBuy = (plan: Plan) => {
    if (!loggedIn) {
      router.push(`/login?next=/subscriptions`);
      return;
    }
    setReferralCode('');
    setReferralState({ checked: false, valid: false });
    setCheckoutPlan(plan);
  };

  const handleValidateReferral = async () => {
    if (!referralCode.trim()) {
      setReferralState({ checked: true, valid: false, message: 'Enter a referral code' });
      return;
    }
    try {
      const res = await fetch('/api/subscriptions/validate-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: referralCode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.valid) {
        setReferralState({ checked: true, valid: true, ownerName: data.ownerName });
      } else {
        setReferralState({ checked: true, valid: false, message: data.message || data.error || 'Invalid referral code' });
      }
    } catch {
      setReferralState({ checked: true, valid: false, message: 'Could not validate referral code' });
    }
  };

  const handleProceed = async () => {
    if (!checkoutPlan) return;
    setInitializing(true);
    try {
      const body: Record<string, unknown> = { planCode: checkoutPlan.code, platform: 'WEB' };
      if (referralCode.trim() && referralState.valid) body.referralCode = referralCode.trim();
      const res = await fetch('/api/subscriptions/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }
      toast.error(data.error || data.message || 'Failed to start checkout');
    } catch {
      toast.error('Failed to start checkout');
    } finally {
      setInitializing(false);
    }
  };

  const copyReferral = () => {
    if (!status?.referralCode) return;
    navigator.clipboard.writeText(status.referralCode).then(() => toast.success('Referral code copied'));
  };

  const showPromo = promo.show && promo.promo && !promoDismissed;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
      <div className="space-y-10">
        <section className="text-center space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/5 px-4 py-1.5 text-sm font-semibold text-[#2563EB]">
            <Crown className="size-4" /> YCKF Premium
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Unlock everything YCKF has to offer
          </h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground">
            Choose a plan to unlock premium courses, exclusive resources and advanced tools.
            Pay securely with card, mobile money or bank transfer.
          </p>
        </section>

        {showPromo && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#2563EB]/30 bg-gradient-to-r from-[#2563EB]/10 to-emerald-500/10 p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-10 items-center justify-center rounded-full bg-[#2563EB]/10">
                <Sparkles className="size-5 text-[#2563EB]" />
              </span>
              <div>
                <p className="font-semibold text-foreground">{promo.promo?.title}</p>
                <p className="text-sm text-muted-foreground">{promo.promo?.message}</p>
                <div className="mt-3">
                  {promoPlacement === 'signup' ? (
                    <Button asChild size="sm">
                      <Link href="/signup">{promo.promo?.ctaLabel}</Link>
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                      <CheckCircle2 className="size-4" /> Added automatically on your first plan
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={dismissPromo} aria-label="Dismiss">
              <X className="size-4" />
            </Button>
          </div>
        )}

        {authLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : loadingPlans ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <section className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.code}
                className={`relative overflow-hidden transition hover:shadow-lg ${
                  plan.code === 'annual' ? 'border-2 border-[#2563EB]' : ''
                }`}
              >
                {plan.code === 'annual' && (
                  <div className="absolute right-0 top-0 rounded-bl-2xl bg-[#2563EB] px-4 py-1.5 text-xs font-bold text-white">
                    Best Value
                  </div>
                )}
                <CardContent className="pt-8">
                  <div className="flex items-center gap-2">
                    <Crown className={`size-5 ${plan.code === 'annual' ? 'text-[#2563EB]' : 'text-muted-foreground'}`} />
                    <h2 className="text-xl font-bold">{plan.name}</h2>
                  </div>
                  {plan.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  )}
                  <div className="mt-6">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {plan.currency} {plan.priceGhs.toFixed(2)}
                    </span>
                    <span className="ml-1 text-sm text-muted-foreground">
                      / {plan.durationValue} {plan.durationUnit.toLowerCase() === 'year' ? 'year' : 'month'}
                      {plan.durationValue > 1 ? 's' : ''}
                    </span>
                  </div>
                  <Button
                    className="mt-6 w-full"
                    variant={plan.code === 'annual' ? 'default' : 'outline'}
                    onClick={() => handleBuy(plan)}
                  >
                    {loggedIn ? 'Get Premium' : 'Sign up to get Premium'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {loggedIn && status && (
          <Card className="bg-card/80">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-[#2563EB]/10">
                    {status.isPremium ? (
                      <ShieldCheck className="size-6 text-emerald-600" />
                    ) : (
                      <Crown className="size-6 text-muted-foreground" />
                    )}
                  </span>
                  <div>
                    <p className="text-lg font-bold">
                      {status.isPremium ? 'Premium active' : 'Not on Premium'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {status.isPremium
                        ? `Expires ${formatDate(status.premiumExpiresAt)}`
                        : 'Choose a plan above to upgrade'}
                    </p>
                  </div>
                </div>
                {status.plan && status.isPremium && (
                  <Badge className="bg-[#2563EB] text-white">{status.plan.name}</Badge>
                )}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Gift className="size-4" /> Your referral code
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold">
                    {status.referralCode || '—'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Share it — you earn 1 bonus hour for every friend who buys their first plan.
                  </p>
                  {status.referralCode && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={copyReferral}>
                      <Copy className="mr-2 size-3.5" /> Copy code
                    </Button>
                  )}
                </div>
                <div className="rounded-xl border p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <ShieldCheck className="size-4" /> What you get
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" /> Full premium course access
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" /> Exclusive tools and resources
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" /> Advanced certifications
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loggedIn && !authLoading && (
          <div className="rounded-3xl border border-border/70 bg-card/60 p-8 text-center">
            <h2 className="text-2xl font-bold">Ready to go Premium?</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Create a free account to unlock your 12-hour Premium trial and start exploring
              everything YCKF has to offer.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link href="/signup">Create free account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={Boolean(checkoutPlan)} onOpenChange={(open) => { if (!open) setCheckoutPlan(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Get {checkoutPlan?.name} Premium</DialogTitle>
            <DialogDescription>
              You&apos;ll be redirected to Paystack to complete your secure payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {checkoutPlan && (
              <div className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="font-semibold">{checkoutPlan.name}</p>
                  <p className="text-xs text-muted-foreground">{checkoutPlan.description}</p>
                </div>
                <span className="text-lg font-bold">
                  {checkoutPlan.currency} {checkoutPlan.priceGhs.toFixed(2)}
                </span>
              </div>
            )}
            <div>
              <Label>Referral code (optional)</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value.toUpperCase());
                    setReferralState({ checked: false, valid: false });
                  }}
                  placeholder="YCKF-XXXXXX"
                  className="font-mono uppercase"
                />
                <Button variant="outline" onClick={handleValidateReferral} type="button">
                  Validate
                </Button>
              </div>
              {referralState.checked && (
                <p className={`mt-1.5 text-sm ${referralState.valid ? 'text-emerald-600' : 'text-red-500'}`}>
                  {referralState.valid
                    ? `Valid — you'll be referred by ${referralState.ownerName || 'a friend'}`
                    : referralState.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutPlan(null)}>Cancel</Button>
            <Button onClick={handleProceed} disabled={initializing || (referralCode.trim() !== '' && !referralState.valid)}>
              {initializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Proceed to payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
