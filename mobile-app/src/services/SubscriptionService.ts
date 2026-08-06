// ============================================
// FILE: src/services/SubscriptionService.ts
// YCKF Premium subscription: plans, status, checkout, referrals, promotions
// ============================================

import AuthService, { API_BASE_URL } from './AuthService';

export interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description: string | null;
  priceGhs: number;
  pricePesewas: number;
  currency: string;
  durationUnit: string;
  durationValue: number;
}

export interface SubscriptionStatus {
  isPremium: boolean;
  status: string;
  premiumStartsAt: string | null;
  premiumExpiresAt: string | null;
  plan: {
    id: number;
    code: string;
    name: string;
    expiresAt: string;
    subscriptionStatus: string;
  } | null;
  referralCode: string | null;
  referredByUserId: number | null;
}

export interface SubscriptionInit {
  authorizationUrl: string;
  reference: string;
  paymentId: number;
  plan: {
    code: string;
    name: string;
    priceGhs: number;
    pricePesewas: number;
    currency: string;
    durationUnit: string;
    durationValue: number;
  };
}

export interface PromoDefinition {
  key: string;
  title: string;
  message: string;
  ctaLabel: string;
  placement: 'signup' | 'subscriptions';
  kind: 'signup_trial' | 'first_subscription_bonus';
  durationHours: number;
}

export interface PromoEligibility {
  show: boolean;
  promo?: PromoDefinition;
  reason?: string;
}

export interface ApiError {
  status?: number;
  code?: string;
  error: string;
  details?: unknown;
}

class SubscriptionService {
  private async headers(): Promise<Record<string, string>> {
    const token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private errorFrom(data: any, fallback: string): ApiError {
    return { status: data?.status, code: data?.code, error: data?.error || fallback };
  }

  async listPlans(): Promise<SubscriptionPlan[]> {
    const res = await fetch(`${API_BASE_URL}/api/subscriptions/plans`, {
      headers: await this.headers(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw this.errorFrom(data, 'Failed to load subscription plans');
    }
    return data.plans as SubscriptionPlan[];
  }

  async getStatus(): Promise<SubscriptionStatus> {
    const res = await fetch(`${API_BASE_URL}/api/subscriptions/status`, {
      headers: await this.headers(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw this.errorFrom(data, 'Failed to load subscription status');
    }
    return data as SubscriptionStatus;
  }

  /**
   * Poll the provider status of a single subscription checkout by its
   * Paystack reference. Returns terminated state as soon as the webhook
   * finishes processing (no dependence on the heavier /status endpoint).
   */
  async getPaymentStatus(reference: string): Promise<{ status: string; paid: boolean; paidAt?: string | null; plan?: string | null }> {
    const res = await fetch(`${API_BASE_URL}/api/subscriptions/payment-status/${encodeURIComponent(reference)}`, {
      headers: await this.headers(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw this.errorFrom(data, 'Failed to load payment status');
    }
    return data as { status: string; paid: boolean; paidAt?: string | null; plan?: string | null };
  }

  /**
   * Request the backend to cancel/park a pending subscription payment that
   * was abandoned by the user. Best-effort; ends the checkout gracefully.
   */
  async cancelPayment(reference: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/subscriptions/${encodeURIComponent(reference)}/cancel`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({}),
    });
    await res.json().catch(() => null);
  }

  async initialize(opts: {
    planCode: string;
    referralCode?: string;
    platform?: string;
  }): Promise<SubscriptionInit> {
    const res = await fetch(`${API_BASE_URL}/api/subscriptions/initialize`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({
        planCode: opts.planCode,
        referralCode: opts.referralCode || undefined,
        platform: opts.platform || 'MOBILE',
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw this.errorFrom(data, 'Failed to initialize subscription');
    }
    return {
      authorizationUrl: data.authorizationUrl,
      reference: data.reference,
      paymentId: data.paymentId,
      plan: data.plan,
    };
  }

  async validateReferral(referralCode: string): Promise<{ valid: boolean; ownerName?: string; message?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/subscriptions/validate-referral`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ referralCode }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw this.errorFrom(data, 'Failed to validate referral code');
    }
    return data as { valid: boolean; ownerName?: string; message?: string };
  }

  async getEligiblePromo(placement: string, platform = 'MOBILE'): Promise<PromoEligibility> {
    const res = await fetch(
      `${API_BASE_URL}/api/promotions/eligible?placement=${encodeURIComponent(placement)}&platform=${encodeURIComponent(platform)}`,
      { headers: await this.headers() }
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { show: false };
    }
    return data as PromoEligibility;
  }

  async trackPromoEngagement(opts: {
    promoKey: string;
    placement: string;
    action: 'impression' | 'dismiss' | 'click';
    platform?: string;
  }): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/promotions/eligible/engagement`, {
        method: 'POST',
        headers: await this.headers(),
        body: JSON.stringify({
          promoKey: opts.promoKey,
          placement: opts.placement,
          action: opts.action,
          platform: opts.platform || 'MOBILE',
        }),
      });
    } catch {
      // engagement tracking is best-effort
    }
  }
}

const subscriptionService = new SubscriptionService();
export default subscriptionService;
