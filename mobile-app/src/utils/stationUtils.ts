
import { Linking, Platform, Alert } from 'react-native';

export interface Station {
  id: string;
  name: string;
  phoneNumber: string;
  emergencyLine: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  region: string;
  division?: string;
  googleMapsLink: string;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
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

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Find the nearest station to given coordinates
 */
export function findNearestStation<T extends Station>(
  userLat: number,
  userLon: number,
  stations: T[]
): { station: T; distance: number } | null {
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
 * Get all stations sorted by distance from user
 */
export function getStationsByDistance<T extends Station>(
  userLat: number,
  userLon: number,
  stations: T[],
  maxDistance?: number
): Array<{ station: T; distance: number }> {
  let stationsWithDistance = stations.map((station) => ({
    station,
    distance: calculateDistance(
      userLat,
      userLon,
      station.latitude,
      station.longitude
    ),
  }));

  if (maxDistance) {
    stationsWithDistance = stationsWithDistance.filter(
      (item) => item.distance <= maxDistance
    );
  }

  return stationsWithDistance.sort((a, b) => a.distance - b.distance);
}

/**
 * Open Google Maps with directions to a station
 */
export async function openGoogleMapsDirections(
  station: Station,
  userLat?: number,
  userLon?: number
): Promise<void> {
  try {
    const destination = `${station.latitude},${station.longitude}`;
    const label = encodeURIComponent(station.name);

    let url: string;

    if (Platform.OS === 'ios') {
      const googleMapsUrl = `comgooglemaps://?daddr=${destination}&directionsmode=driving`;
      
      try {
        const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsUrl);
        
        if (canOpenGoogleMaps) {
          await Linking.openURL(googleMapsUrl);
        } else {
          if (userLat && userLon) {
            url = `http://maps.apple.com/?saddr=${userLat},${userLon}&daddr=${destination}&dirflg=d`;
          } else {
            url = `http://maps.apple.com/?daddr=${destination}&dirflg=d`;
          }
          await Linking.openURL(url);
        }
      } catch (innerError) {
        const browserUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
        await Linking.openURL(browserUrl);
      }
    } else {
      if (userLat && userLon) {
        url = `google.navigation:q=${destination}&origin=${userLat},${userLon}`;
      } else {
        url = `google.navigation:q=${destination}`;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
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
 * Call a station
 */
export async function callStation(phoneNumber: string): Promise<void> {
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
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
}

/**
 * Group stations by city
 */
export function groupStationsByCity<T extends Station>(
  stations: T[]
): Record<string, T[]> {
  return stations.reduce((acc, station) => {
    const city = station.city;
    if (!acc[city]) {
      acc[city] = [];
    }
    acc[city].push(station);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Search stations by name, address, or division
 */
export function searchStations<T extends Station>(
  stations: T[],
  query: string
): T[] {
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
