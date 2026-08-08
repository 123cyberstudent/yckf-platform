// src/services/EmergencySOSService.ts
import LocationService from './LocationService';
import AuthService, { API_BASE_URL } from './AuthService';
import { POLICE_STATIONS } from '../data/policeStations';
import { findNearestStation } from '../utils/stationUtils';

class EmergencySOSService {

  // ── Get user GPS location ─────────────────────────────────────────────────
  private async getUserLocation(): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null> {
    try {
      const locationResult = await LocationService.getCurrentLocation();
      if (!locationResult) return null;

      // Cast to any to avoid TypeScript complaints on dynamic location shape
      const loc = locationResult as any;

      if (loc.coords && loc.coords.latitude !== undefined) {
        return {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy || null,
        };
      }

      if (loc.latitude !== undefined) {
        return {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy || null,
        };
      }

      return null;
    } catch (e) {
      console.error('Location error:', e);
      return null;
    }
  }

  // ── Get readable address from coordinates ─────────────────────────────────
  private async getAddress(
    latitude: number,
    longitude: number
  ): Promise<string> {
    try {
      const result = await LocationService.getAddressFromLocation({
        latitude,
        longitude,
      });
      let address = '';
      if (result?.name) address += result.name + ', ';
      if (result?.city) address += result.city;
      return address;
    } catch (e) {
      return '';
    }
  }

  // ── Get logged-in user contact details ────────────────────────────────────
  private async getUserDetails(): Promise<{
    userName: string;
    userEmail: string;
    userPhone: string;
  }> {
    try {
      const userData = await AuthService.getCurrentUser();
      return {
        userName: (userData as any)?.name || 'Not available',
        userEmail: userData?.email || 'Not available',
        userPhone:
          (userData as any)?.phoneNumber ||
          (userData as any)?.phone_number ||
          'Not available',
      };
    } catch (e) {
      return {
        userName: 'Not available',
        userEmail: 'Not available',
        userPhone: 'Not available',
      };
    }
  }

  // ── MAIN METHOD — called from HomeScreen ──────────────────────────────────
  async sendEmergencyAlert(): Promise<{
    success: boolean;
    stationName?: string;
    stationPhone?: string;
    ticketNumber?: string;
    error?: string;
  }> {
    try {

      // 1 — Get GPS location
      const location = await this.getUserLocation();
      if (!location) {
        return {
          success: false,
          error: 'Could not get your location. Please enable GPS and try again.',
        };
      }

      // 2 — Find nearest police station from local data
      const nearest = findNearestStation(
        location.latitude,
        location.longitude,
        POLICE_STATIONS
      );
      if (!nearest) {
        return {
          success: false,
          error: 'No police station found in your area.',
        };
      }

      // 3 — Get address + user details at the same time
      const [address, userDetails] = await Promise.all([
        this.getAddress(location.latitude, location.longitude),
        this.getUserDetails(),
      ]);

      // 4 — Build a plain-text description the backend stores on the report
      const sentAt = new Date().toLocaleString('en-GH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
      });
      const mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      const description = [
        '🚨 **EMERGENCY ALERT**',
        '',
        'I am in immediate danger and urgently need police assistance. Please respond to my current location immediately.',
        '',
        '**Person in Emergency**',
        `Name: ${userDetails.userName}`,
        `Email: ${userDetails.userEmail}`,
        `Phone: ${userDetails.userPhone}`,
        '',
        '**Nearest Police Station**',
        `Station: ${nearest.station.name}`,
        `Region: ${nearest.station.region}`,
        `Station Phone: ${nearest.station.emergencyLine || nearest.station.phoneNumber}`,
        `Station Address: ${nearest.station.address}`,
        `Distance: ${nearest.distance.toFixed(2)} km`,
        '',
        '**Location**',
        `Coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        `GPS Accuracy: ±${Math.round(location.accuracy ?? 0)} meters`,
        address ? `Address: ${address}` : null,
        `Maps Link: ${mapsLink}`,
        '',
        `Sent At: ${sentAt}`,
      ]
        .filter((line): line is string => line !== null)
        .join('\n');

      // 5 — Submit a structured report to /api/emergency-reports (the same
      //     endpoint the hardware shortcut uses). This creates the record that
      //     appears on the staff dashboard and emails the YCKF admin inboxes.
      const token = await AuthService.getToken();

      const formData = new FormData();
      formData.append('reporterName', userDetails.userName);
      formData.append('reporterPhone', userDetails.userPhone);
      formData.append('reporterEmail', userDetails.userEmail);
      formData.append('incidentType', 'physical_threat');
      formData.append('description', description);
      formData.append('stationName', nearest.station.name);
      formData.append('stationPhone', nearest.station.emergencyLine || nearest.station.phoneNumber);
      formData.append('stationAddress', nearest.station.address);
      formData.append('stationLatitude', String(nearest.station.latitude));
      formData.append('stationLongitude', String(nearest.station.longitude));
      formData.append('gpsLatitude', String(location.latitude));
      formData.append('gpsLongitude', String(location.longitude));
      formData.append('gpsAddress', address);
      formData.append('mapsLink', mapsLink);

      const response = await fetch(`${API_BASE_URL}/api/emergency-reports`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          stationName: nearest.station.name,
          stationPhone: nearest.station.emergencyLine || nearest.station.phoneNumber,
          ticketNumber: data.ticketNumber,
        };
      }

      return {
        success: false,
        error: data?.error || 'Failed to send emergency alert.',
      };

    } catch (error) {
      console.error('EmergencySOSService error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
  }
}

export default new EmergencySOSService();