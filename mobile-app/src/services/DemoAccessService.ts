// ============================================
// FILE: src/services/DemoAccessService.ts
// Demo/Test Access Service - Time-Limited Access
// ============================================

import AuthService, { API_BASE_URL } from './AuthService';
import {PremiumAccessService} from './PremiumAccessService';
import * as Device from 'expo-device';

export interface DemoActivationResult {
  success: boolean;
  premium?: boolean;
  reason?: string;
  demoSessionActive?: boolean;
  expiresAt?: string;
  error?: string;
}

class DemoAccessService {
  /**
   * Activate demo session with token
   * Time-limited access for developers/testers
   */
  async activateDemoSession(demoToken: string): Promise<DemoActivationResult> {
    try {
      const token = await AuthService.getToken();

      if (!token) {
        return {
          success: false,
          error: 'Please log in first',
        };
      }

      // Get device ID
      const deviceId = Device.osBuildId || Device.osInternalBuildId || 'unknown-device';

      const response = await fetch(`${API_BASE_URL}/api/admin/demo/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          demoToken,
          deviceId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Clear premium access cache to force refresh
        PremiumAccessService.clearCache();

        console.log('✅ Demo session activated');
        console.log(`   Expires at: ${data.expiresAt}`);

        return {
          success: true,
          premium: data.premium,
          reason: data.reason,
          demoSessionActive: data.demoSessionActive,
          expiresAt: data.expiresAt,
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to activate demo session',
      };
    } catch (error) {
      console.error('Demo activation error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Check if user has active demo session
   */
  async hasActiveDemoSession(): Promise<boolean> {
    try {
      const access = await PremiumAccessService.checkPremiumAccess();
      return access.demoSessionActive ?? false;
    } catch (error) {
      console.error('Failed to check demo session:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new DemoAccessService();