import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { LocationData, LocationAddress, ServiceResponse } from '../types';
import { LOCATION_CONFIG, ERROR_MESSAGES } from '../utils/constants';

class LocationService {
  private static instance: LocationService;
  private currentLocation: LocationData | null = null;
  private watchSubscription: Location.LocationSubscription | null = null;

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permissions from user
   */
  async requestPermissions(): Promise<ServiceResponse<boolean>> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return {
          success: false,
          error: ERROR_MESSAGES.LOCATION_PERMISSION,
          data: false,
        };
      }

      return {
        success: true,
        data: true,
        message: 'Location permission granted',
      };
    } catch (error) {
      console.error('Location permission request failed:', error);
      return {
        success: false,
        error: 'Failed to request location permission',
        data: false,
      };
    }
  }
/**
   * Get current location with high accuracy
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      // Check permissions first
      const permissionResult = await this.requestPermissions();
      if (!permissionResult.success) {
        throw new Error(permissionResult.error);
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: LOCATION_CONFIG.accuracy,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        altitude: location.coords.altitude ?? undefined,
        altitudeAccuracy: location.coords.altitudeAccuracy ?? undefined,
        heading: location.coords.heading ?? undefined,
        speed: location.coords.speed ?? undefined,
        timestamp: location.timestamp,
      };

      this.currentLocation = locationData;
      return locationData;
    } catch (error) {
      console.error('Failed to get current location:', error);
      Alert.alert('Location Error', ERROR_MESSAGES.LOCATION_PERMISSION);
      return null;
    }
  }

  /**
   * Get address from coordinates using reverse geocoding
   */
  async getAddressFromLocation(location: LocationData): Promise<LocationAddress | null> {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        return {
          street: address.street ?? undefined,
          city: address.city ?? undefined,
          region: address.region ?? undefined,
          postalCode: address.postalCode ?? undefined,
          country: address.country ?? undefined,
          name: address.name ?? undefined,
          district: address.district ?? undefined,
          subregion: address.subregion ?? undefined,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get address from location:', error);
      return null;
    }
  }
  /**
   * Start watching location changes (for live tracking)
   */
  async startWatchingLocation(
    callback: (location: LocationData) => void,
    options?: Location.LocationOptions
  ): Promise<ServiceResponse<boolean>> {
    try {
      // Check permissions
      const permissionResult = await this.requestPermissions();
      if (!permissionResult.success) {
        return permissionResult;
      }

      // Stop existing subscription if any
      if (this.watchSubscription) {
        this.watchSubscription.remove();
      }

      // Start watching location
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
          ...options,
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy ?? undefined,
            altitude: location.coords.altitude ?? undefined,
            altitudeAccuracy: location.coords.altitudeAccuracy ?? undefined,
            heading: location.coords.heading ?? undefined,
            speed: location.coords.speed ?? undefined,
            timestamp: location.timestamp,
          };
          callback(locationData);
        }
      );

      return {
        success: true,
        data: true,
        message: 'Started watching location',
      };
    } catch (error) {
      console.error('Failed to start watching location:', error);
      return {
        success: false,
        error: 'Failed to start location tracking',
        data: false,
      };
    }
  }

  /**
   * Stop watching location changes
   */
  stopWatchingLocation(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
  }

  /**
   * Get cached current location
   */
  getCachedLocation(): LocationData | null {
    return this.currentLocation;
  }
  /**
   * Format location for sharing
   */
  formatLocationForSharing(location: LocationData, address?: LocationAddress): string {
    let message = `📍 Current Location\n\n`;
    message += `Coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\n`;

    if (address) {
      if (address.name) message += `Place: ${address.name}\n`;
      if (address.street) message += `Street: ${address.street}\n`;
      if (address.city) message += `City: ${address.city}\n`;
      if (address.region) message += `Region: ${address.region}\n`;
      if (address.country) message += `Country: ${address.country}\n`;
    }

    if (location.accuracy) {
      message += `Accuracy: ±${Math.round(location.accuracy)}m\n`;
    }

    message += `\nGoogle Maps: https://maps.google.com/?q=${location.latitude},${location.longitude}\n`;
    message += `Timestamp: ${new Date(location.timestamp || Date.now()).toLocaleString()}`;

    return message;
  }

  /**
   * Check if location services are enabled
   */
  async isLocationEnabled(): Promise<boolean> {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      return enabled;
    } catch (error) {
      console.error('Failed to check location services:', error);
      return false;
    }
  }

  /**
   * Get distance between two locations in meters
   */
  getDistanceBetween(
    location1: LocationData,
    location2: LocationData
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (location1.latitude * Math.PI) / 180;
    const φ2 = (location2.latitude * Math.PI) / 180;
    const Δφ = ((location2.latitude - location1.latitude) * Math.PI) / 180;
    const Δλ = ((location2.longitude - location1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopWatchingLocation();
    this.currentLocation = null;
  }
}

// Export singleton instance
export default LocationService.getInstance();
