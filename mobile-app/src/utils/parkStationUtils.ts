
import { ParkStation } from '../data/parks';
import { Linking, Platform, Alert } from 'react-native';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - User latitude
 * @param lon1 - User longitude
 * @param lat2 - Station latitude
 * @param lon2 - Station longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Find the nearest park to given coordinates
 * @param userLat - User's current latitude
 * @param userLon - User's current longitude
 * @param stations - Array of parks
 * @returns Object containing nearest station and distance
 */
export function findNearestParkStation(
  userLat: number,
  userLon: number,
  stations: ParkStation[]
): { station: ParkStation; distance: number } | null {
  if (stations.length === 0) return null;

  let nearest = stations[0];
  let minDistance = calculateDistance(
    userLat,
    userLon,
    nearest.latitude,
    nearest.longitude
  );

  for (let i = 1; i < stations.length; i++) {
    const station = stations[i];
    const distance = calculateDistance(
      userLat,
      userLon,
      station.latitude,
      station.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  return {
    station: nearest,
    distance: minDistance,
  };
}

/**
 * Get all parks sorted by distance from user
 * @param userLat - User's current latitude
 * @param userLon - User's current longitude
 * @param stations - Array of parks
 * @param maxDistance - Optional maximum distance in km (default: no limit)
 * @returns Array of stations with distances, sorted by proximity
 */
export function getParkStationsByDistance(
  userLat: number,
  userLon: number,
  stations: ParkStation[],
  maxDistance?: number
): Array<{ station: ParkStation; distance: number }> {
  let stationsWithDistance = stations.map((station) => ({
    station,
    distance: calculateDistance(
      userLat,
      userLon,
      station.latitude,
      station.longitude
    ),
  }));

  // Filter by max distance if provided
  if (maxDistance) {
    stationsWithDistance = stationsWithDistance.filter(
      (item) => item.distance <= maxDistance
    );
  }

  // Sort by distance (nearest first)
  return stationsWithDistance.sort((a, b) => a.distance - b.distance);
}

/**
 * Open Google Maps with directions to a park
 * Works on both iOS and Android
 * @param station - Park station to navigate to
 * @param userLat - Optional user latitude for better routing
 * @param userLon - Optional user longitude for better routing
 */
export async function openGoogleMapsDirections(
  station: ParkStation,
  userLat?: number,
  userLon?: number
): Promise<void> {
  try {
    const destination = `${station.latitude},${station.longitude}`;
    const label = encodeURIComponent(station.name);

    let url: string;

    if (Platform.OS === 'ios') {
      // iOS - Try Google Maps first, fallback to Apple Maps
      const googleMapsUrl = `comgooglemaps://?daddr=${destination}&directionsmode=driving`;
      
      try {
        const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsUrl);
        
        if (canOpenGoogleMaps) {
          await Linking.openURL(googleMapsUrl);
        } else {
          // Fallback to Apple Maps
          if (userLat && userLon) {
            url = `http://maps.apple.com/?saddr=${userLat},${userLon}&daddr=${destination}&dirflg=d`;
          } else {
            url = `http://maps.apple.com/?daddr=${destination}&dirflg=d`;
          }
          await Linking.openURL(url);
        }
      } catch (innerError) {
        // Final fallback to browser-based Google Maps
        const browserUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
        await Linking.openURL(browserUrl);
      }
    } else {
      // Android - Use Google Maps
      if (userLat && userLon) {
        url = `google.navigation:q=${destination}&origin=${userLat},${userLon}`;
      } else {
        url = `google.navigation:q=${destination}`;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to browser-based Google Maps
        const browserUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
        await Linking.openURL(browserUrl);
      }
    }
  } catch (error) {
    console.error('Error opening maps:', error);
    Alert.alert(
      'Navigation Error',
      'Unable to open maps application. Please ensure you have Google Maps installed.'
    );
  }
}

/**
 * Call a park
 * @param phoneNumber - Park station phone number
 */
export async function callParkStation(phoneNumber: string): Promise<void> {
  try {
    const url = `tel:${phoneNumber}`;
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to make phone calls on this device');
    }
  } catch (error) {
    console.error('Error making call:', error);
    Alert.alert('Error', 'Failed to initiate call. Please try again.');
  }
}

/**
 * Format distance for display
 * @param distance - Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
}

/**
 * Group parks by city
 * @param stations - Array of parks
 * @returns Object with cities as keys and stations as values
 */
export function groupStationsByCity(
  stations: ParkStation[]
): Record<string, ParkStation[]> {
  return stations.reduce((acc, station) => {
    const city = station.city;
    if (!acc[city]) {
      acc[city] = [];
    }
    acc[city].push(station);
    return acc;
  }, {} as Record<string, ParkStation[]>);
}

/**
 * Search parks by name, address, or division
 * @param stations - Array of parks
 * @param query - Search query
 * @returns Filtered array of stations
 */
export function searchParkStations(
  stations: ParkStation[],
  query: string
): ParkStation[] {
  const lowercaseQuery = query.toLowerCase().trim();

  if (!lowercaseQuery) {
    return stations;
  }

  return stations.filter(
    (station) =>
      station.name.toLowerCase().includes(lowercaseQuery) ||
      station.address.toLowerCase().includes(lowercaseQuery) ||
      station.city.toLowerCase().includes(lowercaseQuery) ||
      (station.division?.toLowerCase().includes(lowercaseQuery) ?? false)
  );
}