
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';
import { LocationData, ServiceResponse } from '../types';
import { ACTIVE_CONTACTS } from '../utils/constants';
import LocationService from './LocationService';

class WhatsAppService {
  private static instance: WhatsAppService;

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  /**
   * Check if WhatsApp is installed on the device
   */
  async isWhatsAppInstalled(): Promise<boolean> {
    try {
      // Use the same URL format for checking as we use for opening
      const whatsappURL = 'whatsapp://send';
      const canOpen = await Linking.canOpenURL(whatsappURL);
      return canOpen;
    } catch (error) {
      console.error('Failed to check WhatsApp installation:', error);
      return false;
    }
  }

  /**
   * Open WhatsApp with a message to a specific phone number
   */
  async sendMessage(
    phoneNumber: string,
    message: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      // Check if WhatsApp is installed
      const isInstalled = await this.isWhatsAppInstalled();
      if (!isInstalled) {
        Alert.alert(
          'WhatsApp Not Found',
          'WhatsApp is not installed on your device. Please install WhatsApp to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Install WhatsApp',
              onPress: () => this.openWhatsAppStore(),
            },
          ]
        );
        return {
          success: false,
          error: 'WhatsApp not installed',
          data: false,
        };
      }

      // Format phone number (remove spaces, dashes, etc.)
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      
      // Encode message for URL
      const encodedMessage = encodeURIComponent(message);
      
      let whatsappURL: string;
      
      if (Platform.OS === 'ios') {
        whatsappURL = `whatsapp://send?phone=${cleanPhoneNumber}&text=${encodedMessage}`;
        
        // Fallback to web API if app scheme doesn't work
        const canOpenAppScheme = await Linking.canOpenURL(whatsappURL);
        if (!canOpenAppScheme) {
          whatsappURL = `https://api.whatsapp.com/send?phone=${cleanPhoneNumber}&text=${encodedMessage}`;
        }
      } else {
        // Android works fine with whatsapp:// scheme
        whatsappURL = `whatsapp://send?phone=${cleanPhoneNumber}&text=${encodedMessage}`;
      }
      
      // Open WhatsApp
      const opened = await Linking.openURL(whatsappURL);
      
      return {
        success: true,
        data: opened,
        message: 'WhatsApp opened successfully',
      };
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      
      // If the app scheme fails on iOS, try the web API as fallback
      if (Platform.OS === 'ios') {
        try {
          const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
          const encodedMessage = encodeURIComponent(message);
          const fallbackURL = `https://api.whatsapp.com/send?phone=${cleanPhoneNumber}&text=${encodedMessage}`;
          
          await Linking.openURL(fallbackURL);
          
          return {
            success: true,
            data: true,
            message: 'WhatsApp opened via web API',
          };
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
      
      return {
        success: false,
        error: 'Failed to open WhatsApp',
        data: false,
      };
    }
  }

  /**
   * Share current location via WhatsApp
   */
  async shareCurrentLocation(location?: LocationData): Promise<ServiceResponse<boolean>> {
    try {
      let currentLocation = location;
      
      if (!currentLocation) {
        currentLocation = await LocationService.getCurrentLocation();
        if (!currentLocation) {
          throw new Error('Failed to get current location');
        }
      }

      // Get address for better context
      const address = await LocationService.getAddressFromLocation(currentLocation);
      
      // Format message
      const message = LocationService.formatLocationForSharing(currentLocation, address || undefined);
      
      // Send via WhatsApp
      return await this.sendMessage(ACTIVE_CONTACTS.whatsapp, message);
    } catch (error) {
      console.error('Failed to share current location:', error);
      return {
        success: false,
        error: 'Failed to share location via WhatsApp',
        data: false,
      };
    }
  }

  /**
   * Share live location via WhatsApp (opens WhatsApp for manual sharing)
   */
  async shareLiveLocation(): Promise<ServiceResponse<boolean>> {
    try {
      const isInstalled = await this.isWhatsAppInstalled();
      if (!isInstalled) {
        Alert.alert(
          'WhatsApp Not Found',
          'WhatsApp is not installed on your device.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Install WhatsApp',
              onPress: () => this.openWhatsAppStore(),
            },
          ]
        );
        return {
          success: false,
          error: 'WhatsApp not installed',
          data: false,
        };
      }

      const message = `🚨 YCKF Emergency Alert\n\nI need to share my live location for emergency assistance.\n\nPlease standby while I share my live location...`;
      
      // Send initial message and instructions
      return await this.sendMessage(ACTIVE_CONTACTS.whatsapp, message);
    } catch (error) {
      console.error('Failed to initiate live location sharing:', error);
      return {
        success: false,
        error: 'Failed to initiate live location sharing',
        data: false,
      };
    }
  }

  /**
   * Send cybercrime report via WhatsApp
   */
  async sendCybercrimeReport(reportData: {
    caseId: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    city: string;
    dateOfIncident: Date;
    typeOfCybercrime: string;
    details: string;
    location?: LocationData;
  }): Promise<ServiceResponse<boolean>> {
    try {
      let message = `🚨 CYBERCRIME REPORT\n\n`;
      message += `Case ID: ${reportData.caseId}\n`;
      message += `Name: ${reportData.fullName}\n`;
      message += `Email: ${reportData.email}\n`;
      message += `Phone: ${reportData.phoneNumber}\n`;
      message += `City: ${reportData.city}\n`;
      message += `Date of Incident: ${reportData.dateOfIncident.toLocaleDateString()}\n`;
      message += `Type: ${reportData.typeOfCybercrime}\n\n`;
      message += `Details:\n${reportData.details}\n\n`;
      
      if (reportData.location) {
        message += `Location: ${reportData.location.latitude.toFixed(6)}, ${reportData.location.longitude.toFixed(6)}\n`;
        message += `Google Maps: https://maps.google.com/?q=${reportData.location.latitude},${reportData.location.longitude}\n\n`;
      }
      
      message += `Reported via YCKF Mobile App\n`;
      message += `Timestamp: ${new Date().toLocaleString()}`;

      return await this.sendMessage(ACTIVE_CONTACTS.whatsapp, message);
    } catch (error) {
      console.error('Failed to send cybercrime report via WhatsApp:', error);
      return {
        success: false,
        error: 'Failed to send report via WhatsApp',
        data: false,
      };
    }
  }

  /**
   * Send contact form message via WhatsApp
   */
  async sendContactMessage(contactData: {
    name: string;
    email: string;
    message: string;
  }): Promise<ServiceResponse<boolean>> {
    try {
      let message = `📧 CONTACT MESSAGE\n\n`;
      message += `Name: ${contactData.name}\n`;
      message += `Email: ${contactData.email}\n\n`;
      message += `Message:\n${contactData.message}\n\n`;
      message += `Sent via YCKF Mobile App\n`;
      message += `Timestamp: ${new Date().toLocaleString()}`;

      return await this.sendMessage(ACTIVE_CONTACTS.whatsapp, message);
    } catch (error) {
      console.error('Failed to send contact message via WhatsApp:', error);
      return {
        success: false,
        error: 'Failed to send message via WhatsApp',
        data: false,
      };
    }
  }

  /**
   * Open WhatsApp store for installation
   */
  private async openWhatsAppStore(): Promise<void> {
    try {
      const storeURL = Platform.select({
        ios: 'https://apps.apple.com/app/whatsapp-messenger/id310633997',
        android: 'https://play.google.com/store/apps/details?id=com.whatsapp',
        default: 'https://www.whatsapp.com/download',
      });

      if (storeURL) {
        await Linking.openURL(storeURL);
      }
    } catch (error) {
      console.error('Failed to open WhatsApp store:', error);
    }
  }

  /**
   * Create emergency alert message
   */
  createEmergencyAlert(location?: LocationData): string {
    let message = `🆘 EMERGENCY ALERT - YCKF\n\n`;
    message += `This is an emergency alert sent from YCKF Mobile App.\n\n`;
    message += `User requires immediate assistance.\n\n`;
    
    if (location) {
      message += `Current Location:\n`;
      message += `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\n\n`;
      message += `Google Maps: https://maps.google.com/?q=${location.latitude},${location.longitude}\n\n`;
    }
    
    message += `Time: ${new Date().toLocaleString()}\n`;
    message += `Please respond immediately.`;
    
    return message;
  }

  /**
   * Send emergency alert
   */
  async sendEmergencyAlert(location?: LocationData): Promise<ServiceResponse<boolean>> {
    try {
      const message = this.createEmergencyAlert(location);
      return await this.sendMessage(ACTIVE_CONTACTS.whatsapp, message);
    } catch (error) {
      console.error('Failed to send emergency alert:', error);
      return {
        success: false,
        error: 'Failed to send emergency alert',
        data: false,
      };
    }
  }
}

// Export singleton instance
export default WhatsAppService.getInstance();