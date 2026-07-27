// ============================================
// FILE: src/services/SecureAdminService.ts
// Secure Admin Service - NO HARDCODED CREDENTIALS
// ============================================

import AuthService, { API_BASE_URL } from './AuthService';

export interface Coupon {
  id: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
  maxRedemptions?: number;
  currentRedemptions: number;
  description?: string;
}

export interface CouponRedemption {
  id: string;
  couponCode: string;
  userId: string;
  redeemedAt: string;
  expiresAt: string;
  isActive: boolean;
  accessDuration: number;
}

export interface AuditLog {
  timestamp: string;
  action: string;
  performedBy: string;
  targetUser: string | null;
  details: any;
}

class SecureAdminService {
  /**
   * Check if current user is admin
   * Uses AuthService which checks backend
   */
  async isAdmin(): Promise<boolean> {
    return await AuthService.isAdmin();
  }

  /**
   * Create new coupon (Admin only)
   */
  async createCoupon(
    code: string,
    description?: string,
    durationType?: string,  // ⭐ Add duration type
    expiresAt?: string,
    maxRedemptions?: number
  ): Promise<{ success: boolean; coupon?: Coupon; error?: string }> {
    try {
      const token = await AuthService.getToken();

      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/coupons/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          description,
          durationType,  // ⭐ Include duration type
          expiresAt,
          maxRedemptions,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Coupon created:', code);
        return {
          success: true,
          coupon: data.coupon,
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to create coupon',
      };
    } catch (error) {
      console.error('Create coupon error:', error);
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  /**
   * Get all coupons (Admin only)
   */
  async getAllCoupons(): Promise<Coupon[]> {
    try {
      const token = await AuthService.getToken();

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/coupons`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch coupons');
      }

      const data = await response.json();
      return data.coupons || [];
    } catch (error) {
      console.error('Get coupons error:', error);
      return [];
    }
  }

  /**
   * Deactivate coupon (Admin only)
   */
  async deactivateCoupon(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await AuthService.getToken();

      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/coupons/deactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Coupon deactivated:', code);
        return { success: true };
      }

      return {
        success: false,
        error: data.error || 'Failed to deactivate coupon',
      };
    } catch (error) {
      console.error('Deactivate coupon error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Reactivate coupon (Admin only)
   */
  async reactivateCoupon(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await AuthService.getToken();

      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/coupons/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Coupon reactivated:', code);
        return { success: true };
      }

      return {
        success: false,
        error: data.error || 'Failed to reactivate coupon',
      };
    } catch (error) {
      console.error('Reactivate coupon error:', error);
      return { success: false, error: 'Network error' };
    }
  }


  async deleteCoupon(code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await AuthService.getToken();
    const response = await fetch(`${API_BASE_URL}/api/admin/coupons/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    const data = await response.json();
    return response.ok ? { success: true } : { success: false, error: data.error };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}
  /**
   * Get all redemptions (Admin only)
   */
  async getAllRedemptions(): Promise<CouponRedemption[]> {
    try {
      const token = await AuthService.getToken();

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/redemptions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch redemptions');
      }

      const data = await response.json();
      return data.redemptions || [];
    } catch (error) {
      console.error('Get redemptions error:', error);
      return [];
    }
  }

  /**
   * Get audit logs (Admin only)
   */
  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    try {
      const token = await AuthService.getToken();

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/admin/audit-logs?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      return data.logs || [];
    } catch (error) {
      console.error('Get audit logs error:', error);
      return [];
    }
  }

  /**
   * Rotate demo token (Admin only)
   */
  async rotateDemoToken(newToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await AuthService.getToken();

      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/demo/rotate-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Demo token rotated');
        return { success: true };
      }

      return {
        success: false,
        error: data.error || 'Failed to rotate token',
      };
    } catch (error) {
      console.error('Rotate demo token error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Generate random coupon code
   */
  generateCouponCode(): string {
    const randomString = () =>
      Math.random().toString(36).substring(2, 7).toUpperCase();
    return `YCKF-${randomString()}-${randomString()}`;
  }
}

// Export singleton instance
export default new SecureAdminService();