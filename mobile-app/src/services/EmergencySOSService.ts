// src/services/EmergencySOSService.ts
import LocationService from './LocationService';
import AuthService, { API_BASE_URL } from './AuthService';
import { POLICE_STATIONS } from '../data/policeStations';
import { findNearestStation } from '../utils/stationUtils';

const CENTRAL_EMAIL = 'yckfadmin@youngcyberknightsfoundation.org';
const BACKUP_EMAIL = 'mypracticalworks@gmail.com';

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

  // ── Build full HTML email body ─────────────────────────────────────────────
  private buildEmailHTML(params: {
    userName: string;
    userEmail: string;
    userPhone: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    address: string;
    stationName: string;
    stationRegion: string;
    stationAddress: string;
    stationDistance: string;
    sentAt: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f0f0f0; }
  .container { max-width: 600px; margin: 0 auto; padding: 0; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  .header { background: #dc2626; color: white; padding: 20px 25px; text-align: center; }
  .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px; }
  .header h1 span { margin-right: 8px; }
  .header p { margin: 6px 0 0 0; font-size: 14px; opacity: 0.9; }
  .content { background: #ffffff; padding: 25px 30px; }
  .urgent-box { background: #fffbea; border: 1px solid #f0c040; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 10px; }
  .urgent-dot { width: 14px; height: 14px; background: #dc2626; border-radius: 50%; margin-top: 3px; flex-shrink: 0; }
  .urgent-text { font-size: 14px; color: #333; line-height: 1.5; }
  .urgent-text strong { color: #333; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 15px; font-weight: 700; color: #dc2626; margin-bottom: 10px; border-bottom: 2px solid #dc2626; padding-bottom: 6px; display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-row { margin-bottom: 6px; font-size: 14px; color: #333; }
  .info-label { font-weight: 600; color: #444; display: inline-block; min-width: 150px; }
  .map-link { display: inline-block; background: #1a56db; color: white; padding: 11px 20px; text-decoration: none; border-radius: 6px; margin-top: 12px; font-weight: 600; font-size: 14px; }
  .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 12px; line-height: 1.8; }
</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 EMERGENCY ALERT</h1>
            <p style="margin: 5px 0 0 0; font-size: 16px;">Sent automatically via YCKF Mobile App</p>
          </div>

          <div class="content">

            <div class="urgent-box">
  <div class="urgent-dot"></div>
  <div class="urgent-text">
    <strong>Emergency alert:</strong> Urgent assistance required. Respond <strong>immediately</strong> and use the <strong>provided location details</strong> (coordinates or map link) to proceed to the scene.
  </div>
</div>

            <div class="section">
              <div class="section-title">🚔 NEAREST POLICE STATION</div>
              <div class="info-row"><span class="info-label">Station:</span> ${params.stationName}</div>
              <div class="info-row"><span class="info-label">Region:</span> ${params.stationRegion}</div>
              <div class="info-row"><span class="info-label">Station Address:</span> ${params.stationAddress}</div>
              <div class="info-row"><span class="info-label">Distance from User:</span> ${params.stationDistance} km</div>
            </div>

            <div class="section">
              <div class="section-title">👤 PERSON IN EMERGENCY</div>
              <div class="info-row"><span class="info-label">Full Name:</span> ${params.userName}</div>
              <div class="info-row"><span class="info-label">Email:</span> ${params.userEmail}</div>
              <div class="info-row"><span class="info-label">Phone Number:</span> ${params.userPhone}</div>
            </div>

            <div class="section">
              <div class="section-title">📍 EXACT LOCATION</div>
              <div class="info-row">
                <span class="info-label">Coordinates:</span>
                ${params.latitude.toFixed(6)}, ${params.longitude.toFixed(6)}
              </div>
              ${params.accuracy
        ? `<div class="info-row"><span class="info-label">GPS Accuracy:</span> ±${Math.round(params.accuracy)} meters</div>`
        : ''}
              ${params.address
        ? `<div class="info-row"><span class="info-label">Address:</span> ${params.address}</div>`
        : ''}
              <br>
              <a href="https://maps.google.com/?q=${params.latitude},${params.longitude}" class="map-link">
                📍 View Exact Location on Google Maps
              </a>
            </div>

            <div class="section">
              <div class="section-title">⏰ ALERT TIMESTAMP</div>
              <div class="info-row"><span class="info-label">Sent At:</span> ${params.sentAt}</div>
              <div class="info-row"><span class="info-label">Sent Via:</span> YCKF Mobile Emergency App</div>
            </div>

            <div class="footer">
              <p><strong>Young Cyber Knights Foundation (YCKF)</strong></p>
              <p>This alert was automatically generated. Please respond immediately.</p>
            </div>

          </div>
        </div>
      </body>
      </html>
    `;
  }

  // ── MAIN METHOD — called from HomeScreen ──────────────────────────────────
  async sendEmergencyAlert(): Promise<{
    success: boolean;
    stationName?: string;
    stationPhone?: string;
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

      // 4 — Format timestamp
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

      // 5 — Build full HTML email inside this service
      const htmlBody = this.buildEmailHTML({
        userName: userDetails.userName,
        userEmail: userDetails.userEmail,
        userPhone: userDetails.userPhone,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        address,
        stationName: nearest.station.name,
        stationRegion: nearest.station.region,
        stationAddress: nearest.station.address,
        stationDistance: nearest.distance.toFixed(2),
        sentAt,
      });

      // 6 — Send using the existing /email/send endpoint on the backend
      const token = await AuthService.getToken();

      const response = await fetch(`${API_BASE_URL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          to: [CENTRAL_EMAIL, BACKUP_EMAIL],
          subject: `🚨 EMERGENCY ALERT — ${nearest.station.name} — ${nearest.station.region} Region`,
          html: htmlBody,
          metadata: {
            userEmail: userDetails.userEmail,
            type: 'EMERGENCY_SOS',
            station: nearest.station.name,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          stationName: nearest.station.name,
          stationPhone: nearest.station.phoneNumber,
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to send emergency alert.',
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