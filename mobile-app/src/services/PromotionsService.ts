// ============================================
// FILE: src/services/PromotionsService.ts
// Promotions, promo code validation, referrals
// ============================================

import AuthService, { API_BASE_URL } from './AuthService';

export interface ActivePromotion {
  id: number;
  publicTitle: string | null;
  publicDescription: string | null;
  promotionType: string;
  bannerEnabled: boolean;
  modalEnabled: boolean;
  codeRequired: boolean;
  bonusCredits: number;
}

export interface DiscountBreakdown {
  applied?: boolean;
  code?: string | null;
  promotionType?: string;
  promotionLabel?: string | null;
  discountAmount?: number;
  newSubtotal?: number;
  bonusCredits?: number;
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  code?: string;
  error?: string;
  discount?: DiscountBreakdown;
}

class PromotionsService {
  private async headers(): Promise<Record<string, string>> {
    const token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async listActivePromotions(): Promise<ActivePromotion[]> {
    const res = await fetch(`${API_BASE_URL}/api/promotions`, { headers: await this.headers() });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load promotions');
    }
    return data.promotions as ActivePromotion[];
  }

  async validateCode(code: string, opts?: { orderType?: string; subtotal?: number; productIds?: number[] }): Promise<ValidationResult> {
    const res = await fetch(`${API_BASE_URL}/api/promotions/validate`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        orderType: opts?.orderType ?? 'COURSE',
        subtotal: opts?.subtotal ?? 0,
        productIds: opts?.productIds ?? [],
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { valid: false, error: data.error || 'Failed to validate code' };
    }
    return data;
  }

  async getReferralCode(): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/api/promotions/me/referral-code`, {
      headers: await this.headers(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to get referral code');
    }
    return data.code as string;
  }

  async linkReferral(code: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/promotions/referral/link`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to link referral');
    }
  }
}

const promotionsService = new PromotionsService();
export default promotionsService;
