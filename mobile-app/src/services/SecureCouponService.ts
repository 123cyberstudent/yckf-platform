// ============================================
// FILE: src/services/SecureCouponService.ts
// Secure Coupon Service with Backend Verification
// ============================================

import AuthService, { API_BASE_URL } from './AuthService';
import { PremiumAccessService } from './PremiumAccessService';

export interface CouponValidation {
  valid: boolean;
  message: string;
  description?: string;
  maxRedemptions?: number;
  currentRedemptions?: number;
}

export interface RedemptionResult {
  success: boolean;
  redemption?: {
    redeemedAt: string;
    expiresAt: string;
    accessDuration: number;
  };
  error?: string;
}

class SecureCouponService {
  /**
   * Validate coupon with backend
   */
  async validateCoupon(couponCode: string): Promise<CouponValidation> {
    try {
      const token = await AuthService.getToken();

      if (!token) {
        return {
          valid: false,
          message: 'Please log in to validate coupon',
        };
      }

      const normalizedCode = couponCode.trim().toUpperCase();
      const response = await fetch(`${API_BASE_URL}/api/coupons/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ couponCode: normalizedCode }),
      });

      const data = await response.json();

      return data;
    } catch (error) {
      console.error('Coupon validation error:', error);
      return {
        valid: false,
        message: 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Redeem coupon with backend
   */
 async redeemCoupon(
    couponCode: string  // ⭐ Only coupon code needed
  ): Promise<RedemptionResult> {
    try {
      const token = await AuthService.getToken();

      if (!token) {
        return {
          success: false,
          error: 'Please log in to redeem coupon',
        };
      }

      const normalizedCode = couponCode.trim().toUpperCase();
      const response = await fetch(`${API_BASE_URL}/api/coupons/redeem`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },  
        body: JSON.stringify({ couponCode: normalizedCode }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Clear premium access cache to force refresh
        PremiumAccessService.clearCache();

        console.log('✅ Coupon redeemed successfully');

        return {
          success: true,
          redemption: data.redemption,
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to redeem coupon',
      };
    } catch (error) {
      console.error('Coupon redemption error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }
  /**
   * Generate random coupon code format
   */
  generateCouponCode(): string {
    const randomString = () => Math.random().toString(36).substring(2, 7).toUpperCase();
    return `YCKF-${randomString()}-${randomString()}`;
  }
}
// Export singleton instance
export default new SecureCouponService();