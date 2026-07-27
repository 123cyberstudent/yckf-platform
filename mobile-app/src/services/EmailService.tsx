// ============================================
// FILE: src/services/EmailService.ts
// Updated Email Service - Auto-Send via Backend
// ============================================

import * as MailComposer from 'expo-mail-composer';
import { Alert, Linking } from 'react-native';
import { ServiceResponse, LocationData } from '../types';
import authService, { API_BASE_URL } from './AuthService';

class EmailService {
  private static instance: EmailService;

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private constructor() {}

  // ============================================
  // HELPER: Get Auth Token
  // ============================================
  private async getAuthToken(): Promise<string | null> {
    try {
      return await authService.getToken();
    } catch (error) {
      console.warn('[EmailService] Failed to get auth token', error);
      return null;
    }
  }

  // ============================================
  // HELPER: Manual Email Fallback
  // ============================================
  private async openManualEmail(recipients: string[], subject: string, body: string): Promise<boolean> {
    try {
      const available = await MailComposer.isAvailableAsync();
      
      if (available) {
        const result = await MailComposer.composeAsync({
          recipients,
          subject,
          body,
          isHtml: false,
        });
        return result.status === 'sent';
      } else {
        // Fallback to mailto
        const to = recipients.join(',');
        const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const supported = await Linking.canOpenURL(mailto);
        if (supported) {
          await Linking.openURL(mailto);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('[EmailService] Manual email failed', error);
      return false;
    }
  }

  // ============================================
  // AUTO-SEND: CYBERCRIME REPORT
  // ============================================
  async sendCybercrimeReport(reportData: {
    caseId: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    city: string;
    dateOfIncident: Date | string;
    typeOfCybercrime: string;
    details: string;
    location?: LocationData;
    evidencePhotos?: string[]; // base64 strings
    userId?: string;
  }): Promise<ServiceResponse<boolean>> {
    try {
      console.log('[EmailService] Sending cybercrime report via backend...');

      // Get auth token
      const token = await this.getAuthToken();
      if (!token) {
        console.warn('[EmailService] No auth token - attempting manual fallback');
        const manualSuccess = await this.openManualEmail(
          ['yckfadmin@youngcyberknightsfoundation.org'],
          `Cybercrime Report - ${reportData.caseId}`,
          `Case ID: ${reportData.caseId}\n\nName: ${reportData.fullName}\nEmail: ${reportData.email}\nPhone: ${reportData.phoneNumber}\n\nDetails:\n${reportData.details}`
        );
        
        return {
          success: manualSuccess,
          data: manualSuccess,
          message: manualSuccess ? 'Opened email client manually' : 'Failed to send email'
        };
      }

      // Try auto-send via backend
      const response = await fetch(`${API_BASE_URL}/api/email/cybercrime-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('[EmailService] ✅ Cybercrime report sent automatically');
        return {
          success: true,
          data: true,
          message: 'Report sent automatically via email'
        };
      }

      // Auto-send failed, try manual fallback
      console.warn('[EmailService] Auto-send failed, trying manual fallback...');
      const manualSuccess = await this.openManualEmail(
        ['yckfadmin@youngcyberknightsfoundation.org'],
        `Cybercrime Report - ${reportData.caseId}`,
        `Case ID: ${reportData.caseId}\n\nName: ${reportData.fullName}\nEmail: ${reportData.email}\nPhone: ${reportData.phoneNumber}\n\nDetails:\n${reportData.details}`
      );

      return {
        success: manualSuccess,
        data: manualSuccess,
        message: manualSuccess ? 'Opened email client manually' : 'Failed to send email'
      };

    } catch (error) {
      console.error('[EmailService] Error sending cybercrime report:', error);
      
      // Try manual fallback on error
      const manualSuccess = await this.openManualEmail(
        ['yckfadmin@youngcyberknightsfoundation.org'],
        `Cybercrime Report - ${reportData.caseId}`,
        `Case ID: ${reportData.caseId}\n\nName: ${reportData.fullName}\nEmail: ${reportData.email}\nDetails:\n${reportData.details}`
      );

      return {
        success: manualSuccess,
        data: manualSuccess,
        error: manualSuccess ? undefined : 'Failed to send email',
        message: manualSuccess ? 'Opened email client manually' : undefined
      };
    }
  }

  // ============================================
  // AUTO-SEND: CONTACT MESSAGE
  // ============================================
  async sendContactMessage(contactData: {
    name: string;
    email: string;
    message: string;
  }): Promise<ServiceResponse<boolean>> {
    try {
      console.log('[EmailService] Sending contact message via backend...');

      // Try auto-send via backend (no auth required)
      const response = await fetch(`${API_BASE_URL}/api/email/contact-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('[EmailService] ✅ Contact message sent automatically');
        return {
          success: true,
          data: true,
          message: 'Message sent automatically via email'
        };
      }

      // Auto-send failed, try manual fallback
      console.warn('[EmailService] Auto-send failed, trying manual fallback...');
      const manualSuccess = await this.openManualEmail(
        ['yckfadmin@youngcyberknightsfoundation.org'],
        `Contact Form - ${contactData.name}`,
        `From: ${contactData.name}\nEmail: ${contactData.email}\n\nMessage:\n${contactData.message}`
      );

      return {
        success: manualSuccess,
        data: manualSuccess,
        message: manualSuccess ? 'Opened email client manually' : 'Failed to send message'
      };

    } catch (error) {
      console.error('[EmailService] Error sending contact message:', error);
      
      // Try manual fallback on error
      const manualSuccess = await this.openManualEmail(
        ['yckfadmin@youngcyberknightsfoundation.org'],
        `Contact Form - ${contactData.name}`,
        `From: ${contactData.name}\nEmail: ${contactData.email}\n\nMessage:\n${contactData.message}`
      );

      return {
        success: manualSuccess,
        data: manualSuccess,
        error: manualSuccess ? undefined : 'Failed to send message'
      };
    }
  }

  // ============================================
  // AUTO-SEND ONLY: THIEF DETECTION EVIDENCE
  // ⚠️ NO MANUAL FALLBACK - Security Feature
  // ============================================
  async sendThiefDetectionEvidence(evidenceData: {
    evidenceId: string;
    timestamp: number;
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    address?: string;
    mediaType: 'photo' | 'video';
    mediaUri: string;
    mediaBase64?: string;
    deviceModel?: string;
    deviceOS?: string;
    batteryLevel?: number;
  }): Promise<ServiceResponse<boolean>> {
    try {
      console.log('[EmailService] ��� Sending thief detection evidence (AUTO-SEND ONLY)...');

      // STRICTLY AUTO-SEND - NO MANUAL FALLBACK
      const response = await fetch(`${API_BASE_URL}/api/email/thief-detection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(evidenceData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('[EmailService] ✅ Thief detection evidence sent successfully');
        return {
          success: true,
          data: true,
          message: 'Security alert sent successfully'
        };
      }

      console.error('[EmailService] ❌ Failed to send thief detection evidence');
      return {
        success: false,
        data: false,
        error: data.error || 'Failed to send security alert'
      };

    } catch (error) {
      console.error('[EmailService] ❌ Error sending thief detection evidence:', error);
      return {
        success: false,
        data: false,
        error: 'Network error - security alert not sent'
      };
    }
  }

  // ============================================
  // LEGACY METHODS (Keep for compatibility)
  // ============================================

  async isAvailable(): Promise<boolean> {
    try {
      return await MailComposer.isAvailableAsync();
    } catch (error) {
      return false;
    }
  }

  async sendEmail(
    recipients: string[],
    subject: string,
    body: string,
    attachments?: string[]
  ): Promise<ServiceResponse<boolean>> {
    return await this.openManualEmail(recipients, subject, body) 
      ? { success: true, data: true }
      : { success: false, data: false, error: 'Failed to open email client' };
  }

  async sendLocationEmail(location: LocationData): Promise<ServiceResponse<boolean>> {
    const subject = 'Location Shared from YCKF Mobile App';
    const body = `Coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\nhttps://maps.google.com/?q=${location.latitude},${location.longitude}`;
    
    const success = await this.openManualEmail(
      ['yckfadmin@youngcyberknightsfoundation.org'],
      subject,
      body
    );

    return { success, data: success };
  }

  async sendEmergencyAlert(location?: LocationData): Promise<ServiceResponse<boolean>> {
    const subject = '��� EMERGENCY ALERT - YCKF Mobile App';
    let body = 'EMERGENCY ALERT\n\nUser requires immediate assistance.\n\n';
    
    if (location) {
      body += `Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\n`;
      body += `Google Maps: https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    }

    const success = await this.openManualEmail(
      ['yckfadmin@youngcyberknightsfoundation.org'],
      subject,
      body
    );

    return { success, data: success };
  }

  async sendFeedback(feedbackData: {
    type: string;
    subject: string;
    message: string;
    userEmail?: string;
  }): Promise<ServiceResponse<boolean>> {
    const subject = `[${feedbackData.type}] ${feedbackData.subject}`;
    const body = `Type: ${feedbackData.type}\n${feedbackData.userEmail ? `User: ${feedbackData.userEmail}\n` : ''}\n${feedbackData.message}`;

    const success = await this.openManualEmail(
      ['yckfadmin@youngcyberknightsfoundation.org'],
      subject,
      body
    );

    return { success, data: success };
  }
}
export default EmailService.getInstance();