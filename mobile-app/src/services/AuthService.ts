// ============================================
// FILE: src/services/AuthService.ts
// Production Authentication Service
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

// ✅ UPDATED: Your Render backend URL
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4001'

if (__DEV__) {
  console.log('[YCKF] API base URL:', API_BASE_URL);
}

// ============================================
// AUTO-LOGOUT CONFIGURATION
// ============================================
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

export interface User {
  id: string;
  email: string;
  name: string;
  fullName?: string;
  phoneNumber?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'INVESTIGATOR' | 'VOLUNTEER' | 'USER';
  profileImage?: string;
  referralCode?: string;
  referredByUserId?: number | null;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  message?: string;
  requiresOtp?: boolean;
  challengeId?: number;
  delivery?: string[];
  maskedEmail?: string;
  maskedPhone?: string | null;
  resendAfter?: number;
}

// ============================================
// FORGOT PASSWORD INTERFACES
// ============================================
export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface VerifyResetCodeResponse {
  success: boolean;
  message?: string;
  error?: string;
}

class AuthService {
  private authToken: string | null = null;
  private currentUser: User | null = null;
  
  // ============================================
  // AUTO-LOGOUT PROPERTIES
  // ============================================
  private inactivityTimer: NodeJS.Timeout | null = null;
  private lastActivityTime: number = Date.now();
  private appStateSubscription: any = null;
  private logoutCallback: (() => void) | null = null;

  /**
   * Initialize auth service - Load stored token
   */
  async initialize(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');

      if (token && userData) {
        this.authToken = token;
        this.currentUser = JSON.parse(userData);
        this.startInactivityMonitoring();
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }

  setLogoutCallback(callback: () => void): void {
    this.logoutCallback = callback;
  }

  private startInactivityMonitoring(): void {
    this.lastActivityTime = Date.now();

    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
    }

    this.inactivityTimer = setInterval(() => {
      const currentTime = Date.now();
      const inactiveTime = currentTime - this.lastActivityTime;

      if (inactiveTime >= INACTIVITY_TIMEOUT) {
        this.handleAutoLogout();
      }
    }, 10000);

    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private stopInactivityMonitoring(): void {
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  updateActivity(): void {
    this.lastActivityTime = Date.now();
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active') {
      const currentTime = Date.now();
      const inactiveTime = currentTime - this.lastActivityTime;

      if (inactiveTime >= INACTIVITY_TIMEOUT) {
        this.handleAutoLogout();
      } else {
        this.updateActivity();
      }
    } else if (nextAppState === 'background') {
      this.lastActivityTime = Date.now();
    }
  }

  private async handleAutoLogout(): Promise<void> {
    this.stopInactivityMonitoring();
    await this.logout();

    if (this.logoutCallback) {
      this.logoutCallback();
    }
  }

  /**
   * Register new user
   */
  async register(
  email: string,
  password: string,
  name?: string,
  phoneNumber?: string,
  profileImage?: string | null,
  referralCode?: string
): Promise<AuthResponse> {
    try {
    const normalizedEmail = email.trim().toLowerCase();

    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: normalizedEmail, password, fullName: name, phone: phoneNumber, platform: 'MOBILE', referralCode: referralCode || undefined }),   
  
 });

      const data = await response.json();

      // The backend intentionally does NOT return a token on registration
      // (201 -> { id, email, ... confirmationSent }). A successful register is
      // any 2xx response; the user then verifies email and logs in via OTP.
      if (response.ok) {
        const authToken = data.accessToken || data.token || this.authToken || undefined;
        const user = data.user ? {
          ...data.user,
          name: data.user.fullName || data.user.name,
        } : {
          id: data.id,
          email: normalizedEmail,
          fullName: data.fullName || name,
          phone: data.phone || phoneNumber,
          role: data.role || 'USER',
        };

        await AsyncStorage.setItem('user_data', JSON.stringify(user));

        await AsyncStorage.setItem('lastUser', JSON.stringify({
          name: (user && (user.name || user.fullName)) || name,
          email: normalizedEmail,
          profileImage: profileImage || undefined,
        }));

        if (authToken) {
          await AsyncStorage.setItem('auth_token', authToken);
          this.authToken = authToken;
          this.currentUser = user;
          try {
            await this.sendAdminNewUserNotification(user);
          } catch (emailError) {
            console.warn('Admin notification failed (non-critical):', emailError);
          }
        }

        return {
          success: true,
          token: authToken || null,
          user: user,
        };
      }

      return {
        success: false,
        error: data.error || (Array.isArray(data.errors) && data.errors[0]?.msg) || 'Registration failed',
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Step 1 of login: email/phone + password. Returns an OTP challenge.
   */
  async login(identifier: string, password: string): Promise<AuthResponse> {
  try {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier: normalizedIdentifier, password, platform: 'MOBILE' }),
    });

      const data = await response.json();

      if (data.requiresOtp) {
        return {
          success: false,
          requiresOtp: true,
          challengeId: data.challengeId,
          delivery: data.delivery,
          maskedEmail: data.maskedEmail,
          maskedPhone: data.maskedPhone,
          resendAfter: data.resendAfter,
          message: data.message || 'A verification code has been sent.',
        };
      }

      if (response.ok && (data.accessToken || data.token)) {
        const authToken = data.accessToken || data.token;
        const user = data.user ? {
          ...data.user,
          name: data.user.fullName || data.user.name,
        } : data.user;

        await AsyncStorage.setItem('auth_token', authToken);
        await AsyncStorage.setItem('user_data', JSON.stringify(user));

        await AsyncStorage.setItem('lastUser', JSON.stringify({
          name: user.name,
          email: normalizedIdentifier,
          profileImage: user.profileImage,
        }));

        this.authToken = authToken;
        this.currentUser = user;

        this.startInactivityMonitoring();

        return {
          success: true,
          token: authToken,
          user: user,
        };
      }

      return {
        success: false,
        error: data.error || 'Invalid credentials',
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Step 2 of login: verify the OTP code and receive tokens.
   */
  async verifyOtp(challengeId: number, code: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, code: code.trim(), platform: 'MOBILE' }),
      });

      const data = await response.json();

      if (response.ok && (data.accessToken || data.token)) {
        const authToken = data.accessToken || data.token;
        const user = data.user ? {
          ...data.user,
          name: data.user.fullName || data.user.name,
        } : data.user;

        await AsyncStorage.setItem('auth_token', authToken);
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        await AsyncStorage.setItem('lastUser', JSON.stringify({
          name: user.name,
          email: user.email,
          profileImage: user.profileImage,
        }));

        this.authToken = authToken;
        this.currentUser = user;
        this.startInactivityMonitoring();

        return { success: true, token: authToken, user };
      }

      return { success: false, error: data.error || 'Invalid verification code' };
    } catch (error) {
      console.error('OTP verify error:', error);
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Resend the OTP code for a pending challenge.
   */
  async resendOtp(challengeId: number): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/otp/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          resendAfter: data.resendAfter,
          message: data.message || 'A new code has been sent.',
        };
      }

      return { success: false, error: data.error || 'Failed to resend code' };
    } catch (error) {
      console.error('OTP resend error:', error);
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Call backend to invalidate session
      if (this.authToken) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.stopInactivityMonitoring();

      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      await AsyncStorage.removeItem('premium_subscription');

      this.authToken = null;
      this.currentUser = null;
    }
  }

  // ============================================
  // FORGOT PASSWORD FEATURE
  // ============================================

  /**
   * Request password reset - Send reset code to user's email
   * @param email - User's email address
   * @returns Promise with success status and message
   */
  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: data.message || 'Password reset code sent to your email',
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to send reset code',
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Verify reset code sent to user's email
   * @param email - User's email address
   * @param code - Reset code from email
   * @returns Promise with success status
   */
  async verifyResetCode(email: string, code: string): Promise<VerifyResetCodeResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: data.message || 'Code verified successfully',
        };
      }

      return {
        success: false,
        error: data.error || 'Invalid or expired reset code',
      };
    } catch (error) {
      console.error('Verify reset code error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Reset password with verified code
   * @param email - User's email address
   * @param code - Verified reset code
   * @param newPassword - New password
   * @returns Promise with success status
   */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<ResetPasswordResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: data.message || 'Password reset successfully',
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to reset password',
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  async getToken(): Promise<string | null> {
    if (this.authToken) {
      return this.authToken;
    }

    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      this.authToken = token;
      return token;
    }

    return null;
  }

  /**
   * Get current user
   */
  async getCurrentUser(forceRefresh: boolean = false): Promise<User | null> {
    if (!forceRefresh && this.currentUser) {
      this.updateActivity();
      return this.currentUser;
    }

    // Try to load from storage
    if (!forceRefresh) {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        this.updateActivity();
        return this.currentUser;
      }
    }

    // Try to fetch from backend
    try {
      const token = await this.getToken();
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        this.currentUser = user;
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        this.updateActivity();
        return user;
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }
   async isAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'VOLUNTEER';
  }

  async refreshUser(): Promise<User | null> {
    this.currentUser = null;
    return await this.getCurrentUser();
  }

  /**
   * Send admin notification when new user registers
   * @param userData - New user's information
   */
  private async sendAdminNewUserNotification(userData: User): Promise<void> {
    try {
      const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0066cc; color: white; padding: 30px 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .info-box { background: #EFF6FF; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0066cc; }
            .info-box strong { color: #0066cc; display: block; margin-bottom: 10px; font-size: 16px; }
            .detail-row { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: bold; color: #555; min-width: 140px; display: inline-block; }
            .detail-value { color: #333; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; color: #666; font-size: 12px; }
            .stats-box { background: #FEF3C7; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 New User Registration</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">YCKF Platform</p>
            </div>
            <div class="content">
              <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>A new user has successfully registered on the YCKF platform.</strong>
              </p>

              <div class="info-box">
                <strong>👤 User Information:</strong>
                <div class="detail-row">
                  <span class="detail-label">Full Name:</span>
                  <span class="detail-value">${userData.name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Email Address:</span>
                  <span class="detail-value">${userData.email}</span>
                </div>
                ${userData.phoneNumber ? `
                <div class="detail-row">
                  <span class="detail-label">Phone Number:</span>
                  <span class="detail-value">${userData.phoneNumber}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="detail-label">User ID:</span>
                  <span class="detail-value">${userData.id}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Account Type:</span>
                  <span class="detail-value">${['ADMIN', 'SUPER_ADMIN'].includes(userData.role) ? 'Administrator' : 'Standard User'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Registration Date:</span>
                  <span class="detail-value">${new Date().toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                  })}</span>
                </div>
              </div>

              <div class="stats-box">
                <strong style="color: #92400E;">📊 Quick Actions:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400E;">
                  <li>Review user profile in admin dashboard</li>
                  <li>Monitor user activity and engagement</li>
                  <li>Verify user information if needed</li>
                  <li>Send welcome message or onboarding materials</li>
                </ul>
              </div>

              <div class="footer">
                <p><strong>Young Cyber Knights Foundation</strong></p>
                <p>Administrative Notification System</p>
                <p style="margin-top: 15px;">
                  This is an automated notification from the YCKF Mobile App.<br>
                  For support, contact: <a href="mailto:yckfadmin@youngcyberknightsfoundation.org" style="color: #0066cc;">yckfadmin@youngcyberknightsfoundation.org</a>
                </p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                <p style="font-size: 11px; color: #999;">
                  This notification was sent automatically. Please do not reply to this email.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const response = await fetch(`${API_BASE_URL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: ['yckfadmin@youngcyberknightsfoundation.org', 'mypracticalworks@gmail.com'],
          subject: '🎉 New User Registration - YCKF Platform',
          html: htmlTemplate,
          metadata: {
            userEmail: userData.email,
            userName: userData.name,
            userId: userData.id,
            action: 'NEW_USER_REGISTRATION'
          }
        })
      });

      if (!response.ok) {
        console.warn('⚠️ Admin notification request failed');
      }
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error);
      // Don't throw - this is non-critical
    }
  }
}
// Export singleton instance
const authService = new AuthService();
// Initialize on app start
authService.initialize();
export default authService;