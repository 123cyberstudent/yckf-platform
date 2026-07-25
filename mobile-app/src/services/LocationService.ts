// src/services/LocationService.ts
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import { LocationData, LocationAddress } from '../types';

/**
 * Opens the app settings so the user can enable permissions manually.
 */
const openAppSettings = async () => {
  try {
    await Linking.openSettings();
  } catch (e) {
    // fallback attempt for older platforms
    const url = Platform.OS === 'android' ? 'app-settings:' : 'App-Prefs:';
    Linking.openURL(url).catch(() => {
      console.warn('Unable to open app settings', e);
    });
  }
};

const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    // First check current status without prompting
    const current = await Location.getForegroundPermissionsAsync();

    // If not granted, try to request permission (may show prompt)
    if (!current.granted) {
      const requested = await Location.requestForegroundPermissionsAsync();

      // If still not granted
      if (!requested.granted) {
        const canAskAgain = requested.canAskAgain ?? current.canAskAgain ?? true;

        if (!canAskAgain) {
          // Permission permanently denied — instruct user to open settings
          Alert.alert(
            'Location permission required',
            'Location permission is required to capture GPS coordinates. Please enable location for this app in your device Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openAppSettings },
            ]
          );
        } else {
          // Not permanently denied but denied for now
          Alert.alert('Location permission denied', 'Cannot access location. Please allow location permission.');
        }

        return null;
      }
    }

    // At this point permission is granted (either already or just requested)
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
      maximumAge: 1000 * 5,
      timeout: 10000,
    });

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? 0,
      timestamp: loc.timestamp,
    };
  } catch (err) {
    console.warn('Failed to get current location:', err);
    Alert.alert('Location Error', 'Failed to capture location. Make sure GPS is enabled and try again.');
    return null;
  }
};

const getAddressFromLocation = async (loc: LocationData): Promise<LocationAddress | null> => {
  try {
    if (!loc) return null;
    const results = await Location.reverseGeocodeAsync({
      latitude: loc.latitude,
      longitude: loc.longitude,
    });

    if (!results || results.length === 0) return null;

    const r = results[0];
    return {
      name: r.name ?? '',
      street: r.street ?? '',
      city: r.city ?? r.subregion ?? '',
      region: r.region ?? '',
      country: r.country ?? '',
      postalCode: r.postalCode ?? '',
    };
  } catch (err) {
    console.warn('Reverse geocode failed:', err);
    return null;
  }
};

const formatLocationForSharing = (loc: LocationData, addr?: LocationAddress): string => {
  const coords = `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`;
  const accuracy = loc.accuracy ? `±${Math.round(loc.accuracy)}m` : 'N/A';
  const time = loc.timestamp ? new Date(loc.timestamp).toLocaleString() : '';
  const placeParts: string[] = [];
  if (addr?.name) placeParts.push(addr.name);
  if (addr?.city) placeParts.push(addr.city);
  if (addr?.region) placeParts.push(addr.region);
  const place = placeParts.join(', ');

  return (
    `📍 Current Location\n\n` +
    `• Coordinates: ${coords}\n` +
    (place ? `• Place: ${place}\n` : '') +
    `• Accuracy: ${accuracy}\n` +
    (time ? `• Time: ${time}\n` : '') +
    `\nGoogle Maps: https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
  );
};

export default {
  getCurrentLocation,
  getAddressFromLocation,
  formatLocationForSharing,
};