// ============================================
// FILE: src/services/PremiumAccessService.ts
// Production Premium Access Service
// ⚠️ REPLACE your current PremiumAccessService.ts with this
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService, { API_BASE_URL } from './AuthService';

export interface PremiumAccess {
  premium: boolean;
  reason: 'subscription' | 'admin' | 'coupon' | 'demo' | 'none';
  expiresAt?: string;
  demoSessionActive?: boolean;
  timeRemaining?: number; // minutes
}

export class PremiumAccessService {
  private static cacheKey = 'premium_access_cache';
  private static cacheTimestamp: number = 0;
  private static cachedAccess: PremiumAccess | null = null;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if user has premium access (Production version - calls backend)
   */
  static async checkPremiumAccess(forceRefresh: boolean = false): Promise<PremiumAccess> {
    // Check cache first
    if (!forceRefresh && this.cachedAccess && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.cachedAccess;
    }

    try {
      const token = await AuthService.getToken();

      if (!token) {
        return { premium: false, reason: 'none' };
      }

      // Call backend to check entitlements
      const response = await fetch(`${API_BASE_URL}/api/entitlements`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check premium access');
      }

      const data = await response.json();

      const access: PremiumAccess = {
        premium: data.premium,
        reason: data.reason,
        expiresAt: data.expiresAt,
        demoSessionActive: data.demoSessionActive,
        timeRemaining: data.timeRemaining,
      };

      this.updateCache(access);
      return access;
    } catch (error) {
      console.error('Failed to check premium access:', error);
      return { premium: false, reason: 'none' };
    }
  }

  /**
   * Get premium status message
   */
  static async getPremiumStatusMessage(): Promise<string> {
    const access = await this.checkPremiumAccess();

    if (!access.premium) {
      return 'Upgrade to unlock premium features';
    }

    switch (access.reason) {
      case 'admin':
        return 'Admin - Full Access';

      case 'subscription':
        if (access.expiresAt) {
          const expiryDate = new Date(access.expiresAt);
          return `Active until ${expiryDate.toLocaleDateString()}`;
        }
        return 'Premium Active';

      case 'coupon':
        if (access.timeRemaining) {
          const hours = Math.floor(access.timeRemaining / 60);
          const mins = access.timeRemaining % 60;
          return `${hours}h ${mins}m remaining (Coupon)`;
        }
        return 'Premium Active (Coupon)';

      case 'demo':
        if (access.timeRemaining) {
          const hours = Math.floor(access.timeRemaining / 60);
          const mins = access.timeRemaining % 60;
          return `${hours}h ${mins}m remaining (Demo)`;
        }
        return 'Premium Active (Demo)';

      default:
        return 'Premium Active';
    }
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cachedAccess = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Update cache
   */
  private static updateCache(access: PremiumAccess): void {
    this.cachedAccess = access;
    this.cacheTimestamp = Date.now();
  }
}