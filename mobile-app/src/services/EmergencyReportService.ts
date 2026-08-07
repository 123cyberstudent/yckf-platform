// src/services/EmergencyReportService.ts
// Shared engine for the structured emergency report. Both the Emergency screen
// and the hardware shortcut call this so they stay on one code path.

import AuthService, { API_BASE_URL } from './AuthService';
import LocationService from './LocationService';
import { POLICE_STATIONS } from '../data/policeStations';
import { findNearestStation } from '../utils/stationUtils';

const NA = 'Not Available';

export function generateClientTicket(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `EMG-${ymd}-${rand}`;
}

export function incidentTypeLabel(value?: string): string {
  if (!value) return 'Other';
  const map: Record<string, string> = {
    cyber_threat: 'Cyber Threat',
    physical_threat: 'Physical Threat',
    data_breach: 'Data Breach',
    fraud: 'Fraud',
    harassment: 'Harassment',
    medical: 'Medical',
    fire: 'Fire',
    other: 'Other',
  };
  return map[value] || value;
}

function formatSubmittedAt(date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GH', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: true,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

// Resolve best-available coords: cached location is the documented source we
// can rely on non-interactively; the shortcut does not trigger a blocking GPS
// acquisition. Missing coords degrade gracefully.
async function resolveLocation(): Promise<{
  latitude: number | null;
  longitude: number | null;
  isLastKnown: boolean;
  address: string;
}> {
  const cached = LocationService.getCachedLocation();
  const lat = cached?.latitude ?? null;
  const lng = cached?.longitude ?? null;
  const isLastKnown = true; // any coords we use here came from cache/last-known

  let address = '';
  if (lat != null && lng != null) {
    try {
      const addr = await LocationService.getAddressFromLocation({ latitude: lat, longitude: lng });
      const parts = [addr?.name, addr?.street, addr?.city, addr?.region, addr?.country].filter(Boolean);
      address = parts.join(', ');
    } catch {
      // non-fatal
    }
  }
  return { latitude: lat, longitude: lng, isLastKnown, address };
}

export interface EmergencySendResult {
  success: boolean;
  ticketNumber?: string;
  error?: string;
}

export interface EmergencySendInput {
  incidentType?: string;
  stationName?: string;
  stationPhone?: string;
  stationAddress?: string;
  stationLatitude?: string;
  stationLongitude?: string;
  description?: string;
}

class EmergencyReportService {
  /**
   * Build + submit a structured emergency report to the backend. Never blocks
   * on missing location/station. Returns a result rather than throwing.
   */
  async sendAlert(input: EmergencySendInput = {}): Promise<EmergencySendResult> {
    try {
      const user = await AuthService.getCurrentUser();
      const name =
        (user as any)?.displayName || (user as any)?.fullName || (user as any)?.name || (user as any)?.full_name || '';
      const phone =
        (user as any)?.phoneNumber || (user as any)?.phone_number || (user as any)?.phone || '';
      const email = user?.email || '';

      const loc = await resolveLocation();

      let stationName = input.stationName || NA;
      let stationPhone = input.stationPhone || NA;
      let stationAddress = input.stationAddress || NA;
      let stationLat = input.stationLatitude || '';
      let stationLon = input.stationLongitude || '';
      if (loc.latitude != null && loc.longitude != null) {
        try {
          const nearest = findNearestStation(loc.latitude, loc.longitude, POLICE_STATIONS);
          if (nearest) {
            stationName = nearest.station.name;
            stationPhone = nearest.station.emergencyLine || nearest.station.phoneNumber || NA;
            stationAddress = nearest.station.address || NA;
            stationLat = String(nearest.station.latitude);
            stationLon = String(nearest.station.longitude);
          }
        } catch {
          // non-fatal
        }
      }

      const gpsText =
        loc.latitude != null && loc.longitude != null
          ? loc.isLastKnown
            ? `Last Known Location: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`
            : `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`
          : NA;
      const mapsLink =
        loc.latitude != null && loc.longitude != null
          ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
          : NA;

      const typedDescription = input.description?.trim();
      const lines: string[] = [
        '🚨 **EMERGENCY REPORT**',
        '',
        '**EMERGENCY ALERT:** I am in immediate danger and urgently need police assistance. Please respond to my current location immediately using the location details provided below.',
        '',
        '**Emergency Report Details**',
        `Ticket Number: ${generateClientTicket()}`,
        `Incident Type: ${incidentTypeLabel(input.incidentType)}`,
        `Reporter: ${name || NA}`,
        `Phone: ${phone || NA}`,
        `Email: ${email || NA}`,
        `Nearest Police Station: ${stationName}`,
        `Station Phone: ${stationPhone}`,
        `GPS Location: ${gpsText}`,
        `Maps Link: ${mapsLink}`,
        `GPS Address: ${loc.address || NA}`,
        `Submitted At: ${formatSubmittedAt(new Date())}`,
      ];
      if (typedDescription) {
        lines.push('', '**More Details:**');
        lines.push(typedDescription);
      } else if (loc.latitude == null) {
        lines.push('', '⚠️ No GPS location available. Contact emergency services directly if you are able.');
      }

      const description = lines.join('\n');

      const formData = new FormData();
      formData.append('reporterName', name);
      formData.append('reporterPhone', phone);
      formData.append('reporterEmail', email);
      formData.append('incidentType', input.incidentType || 'other');
      formData.append('description', description);
      formData.append('stationName', stationName === NA ? '' : stationName);
      formData.append('stationPhone', stationPhone === NA ? '' : stationPhone);
      formData.append('stationAddress', stationAddress === NA ? '' : stationAddress);
      if (stationLat) formData.append('stationLatitude', stationLat);
      if (stationLon) formData.append('stationLongitude', stationLon);
      if (loc.latitude != null) formData.append('gpsLatitude', String(loc.latitude));
      if (loc.longitude != null) formData.append('gpsLongitude', String(loc.longitude));
      if (mapsLink !== NA) formData.append('mapsLink', mapsLink);
      if (loc.address) formData.append('gpsAddress', loc.address);

      const token = await AuthService.getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/api/emergency-reports`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const result = await response.json();

      if (response.ok && result?.success) {
        return { success: true, ticketNumber: result.ticketNumber };
      }
      return { success: false, error: result?.error || 'Failed to submit emergency report.' };
    } catch (error) {
      console.error('EmergencyReportService.sendAlert error:', error);
      return {
        success: false,
        error:
          error instanceof Error && error.message
            ? error.message
            : 'Network error. Please check your connection and try again.',
      };
    }
  }
}

export default new EmergencyReportService();