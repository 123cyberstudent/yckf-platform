import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ServiceResponse } from '../types';

// Configure notification behavior

Notifications.setNotificationHandler({
  handleNotification: async (): Promise<any> => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

class NotificationService {
  private static instance: NotificationService;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service
   */
  async initialize(): Promise<ServiceResponse<boolean>> {
    try {
      // Set notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1e3a8a',
        });

        // Create emergency channel
        await Notifications.setNotificationChannelAsync('emergency', {
          name: 'Emergency Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#dc2626',
          sound: 'default',
        });

        // Create reports channel
        await Notifications.setNotificationChannelAsync('reports', {
          name: 'Report Status',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#059669',
        });
      }

      return {
        success: true,
        data: true,
        message: 'Notification service initialized',
      };
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return {
        success: false,
        error: 'Failed to initialize notifications',
        data: false,
      };
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<ServiceResponse<boolean>> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      
      return {
        success: status === 'granted',
        data: status === 'granted',
        message: status === 'granted' ? 'Notification permission granted' : 'Permission denied',
      };
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return {
        success: false,
        error: 'Failed to request notification permissions',
        data: false,
      };
    }
  }

  /**
   * Show local notification
   */  

async showNotification(
  title: string,
  body: string,
  data?: any,
  channelId: string = 'default'
): Promise<ServiceResponse<string>> {
  try {
    // Build content object once (channelId only set where needed)
    const content: any = {
      title,
      body,
      data,
      sound: 'default',
    };

    if (Platform.OS === 'android' && channelId) {
      // channelId must live inside content for Android
      content.channelId = channelId;
    }

    // For immediate delivery, omit trigger or set to undefined
    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      // `trigger: undefined` -> show immediately (this avoids some TS complaints about `null`)
      trigger: undefined,
    });

    return {
      success: true,
      data: notificationId,
      message: 'Notification sent',
    };
  } catch (error) {
    console.error('Failed to show notification:', error);
    return {
      success: false,
      error: 'Failed to show notification',
      data: '',
    };
  }
}
  /**
   * Show report submitted notification
   */
  async showReportSubmittedNotification(
    caseId: string,
    reportType: string = 'cybercrime report'
  ): Promise<void> {
    await this.showNotification(
      'Report Submitted Successfully',
      `Your ${reportType} has been submitted with Case ID: ${caseId}`,
      { type: 'report_submitted', caseId },
      'reports'
    );
  }

  /**
   * Show case update notification
   */
  async showCaseUpdateNotification(
    caseId: string,
    status: string,
    message?: string
  ): Promise<void> {
    await this.showNotification(
      'Case Update',
      message || `Your case ${caseId} status has been updated to: ${status}`,
      { type: 'case_update', caseId, status },
      'reports'
    );
  }

  /**
   * Show emergency alert notification
   */
  async showEmergencyAlert(message: string): Promise<void> {
    await this.showNotification(
      '🚨 Emergency Alert',
      message,
      { type: 'emergency', priority: 'high' },
      'emergency'
    );
 }

  /**
   * Show location shared notification
   */
  async showLocationSharedNotification(): Promise<void> {
    await this.showNotification(
      'Location Shared',
      'Your current location has been shared with YCKF successfully.',
      { type: 'location_shared' }
    );
  }

  /**
   * Show data saved to safebox notification
   */
  async showDataSavedNotification(itemType: string): Promise<void> {
    await this.showNotification(
      'Data Saved',
      `${itemType} has been saved to your Evidence SafeBox for later submission.`,
      { type: 'data_saved', itemType }
    );
  }

  /**
   * Schedule reminder notification
   */
async scheduleReminder(
  title: string,
  body: string,
  delayInSeconds: number,
  data?: any
): Promise<ServiceResponse<string>> {
  try {
    // Make sure we have at least 1 second delay (some platforms don't like 0)
    const seconds = Math.max(1, Math.floor(delayInSeconds));

    const content: any = {
      title,
      body,
      data,
      sound: 'default',
    };

    // platform-specific notes:
    // - Android accepts small second values.
    // - iOS may require >= 60 seconds for reliable scheduling; if you want to be safe,
    //   detect Platform.OS === 'ios' and force seconds >= 60. Uncomment the line below if needed.
    // if (Platform.OS === 'ios') seconds = Math.max(60, seconds);

    const trigger: any = {
      seconds,
      // set repeats to false by default. If you want repeating reminders, pass repeats: true
      repeats: false,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    return {
      success: true,
      data: notificationId,
      message: 'Reminder scheduled',
    };
  } catch (error) {
    console.error('Failed to schedule reminder:', error);
    return {
      success: false,
      error: 'Failed to schedule reminder',
      data: '',
    };
  }
}
  /**
   * Cancel notification
   */
  async cancelNotification(notificationId: string): Promise<ServiceResponse<boolean>> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      
      return {
        success: true,
        data: true,
        message: 'Notification cancelled',
      };
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      return {
        success: false,
        error: 'Failed to cancel notification',
        data: false,
      };
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<ServiceResponse<boolean>> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      return {
        success: true,
        data: true,
        message: 'All notifications cancelled',
      };
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
      return {
        success: false,
        error: 'Failed to cancel notifications',
        data: false,
      };
    }
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync();
  }

  /**
   * Add notification listener
   */
  addNotificationListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Adding notification response listener (when user taps notification)
   */
  addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }
}

// Export singleton instance
export default NotificationService.getInstance();
