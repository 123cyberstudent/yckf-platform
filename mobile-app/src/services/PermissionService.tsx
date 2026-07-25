import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';
import { AppPermissions, PermissionStatus } from '../types';

/**
 * Request location permission
 */
export async function requestLocationPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain !== false,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('Failed to request location permission:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: 'denied',
    };
  }
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain !== false,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('Failed to request camera permission:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: 'denied',
    };
  }
}

/**
 * Request media library permission
 */
export async function requestMediaLibraryPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain !== false,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('Failed to request media library permission:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: 'denied',
    };
  }
}

/**
 * Request notifications permission
 */
export async function requestNotificationsPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain !== false,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('Failed to request notifications permission:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: 'denied',
    };
  }
}

/**
 * Check location permission status
 */
export async function checkLocationPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain !== false,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('Failed to check location permission:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: 'denied',
    };
  }
}

/**
 * Check camera permission status
 */
export async function checkCameraPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain !== false,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('Failed to check camera permission:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: 'denied',
    };
  }
}

/**
[O * Check media library permission status
 */
export async function checkMediaLibraryPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain !== false,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('Failed to check media library permission:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: 'denied',
    };
  }
}

/**
 * Check notifications permission status
 */
export async function checkNotificationsPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain !== false,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('Failed to check notifications permission:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: 'denied',
    };
  }
}

/**
 * Request all permissions at once
 */
export async function requestPermissions(): Promise<AppPermissions> {
  const [location, camera, mediaLibrary, notifications] = await Promise.all([
    requestLocationPermission(),
    requestCameraPermission(),
    requestMediaLibraryPermission(),
    requestNotificationsPermission(),
  ]);

  return {
    location,
    camera,
    mediaLibrary,
    notifications,
  };
}

/**
 * Check all permissions at once
 */
export async function checkAllPermissions(): Promise<AppPermissions> {
  const [location, camera, mediaLibrary, notifications] = await Promise.all([
    checkLocationPermission(),
    checkCameraPermission(),
    checkMediaLibraryPermission(),
    checkNotificationsPermission(),
  ]);

  return {
    location,
    camera,
    mediaLibrary,
    notifications,
  };
}

/**
 * Show permission denied alert with option to open settings
 */
export function showPermissionDeniedAlert(
  permissionName: string,
  message: string = `${permissionName} permission is required for this feature to work properly.`
): void {
  Alert.alert(
    'Permission Required',
    message,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => openAppSettings(),
      },
    ]
  );
}

/**
 * Open device app settings
 */
export async function openAppSettings(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  } catch (error) {
    console.error('Failed to open app settings:', error);
    Alert.alert('Error', 'Unable to open app settings. Please open settings manually.');
  }
}

/**
 * Get permission status text for display
 */
export function getPermissionStatusText(status: PermissionStatus): string {
  if (status.granted) {
    return 'Granted';
  } else if (status.status === 'denied') {
    return status.canAskAgain ? 'Denied' : 'Permanently Denied';
  } else {
    return 'Not Requested';
  }
}

/**
 * Check if permission is critically needed and show alert
 */
export function handleCriticalPermission(
  permissionName: string,
  status: PermissionStatus,
  feature: string
): boolean {
  if (!status.granted) {
    if (status.canAskAgain) {
      Alert.alert(
        'Permission Required',
        `${permissionName} permission is required to ${feature}. Please grant permission to continue.`,
        [{ text: 'OK' }]
      );
    } else {
      showPermissionDeniedAlert(
        permissionName,
        `${permissionName} permission was permanently denied. Please enable it in Settings to ${feature}.`
      );
    }
    return false;
  }
  return true;
}