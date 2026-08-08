// src/services/StolenDeviceService.ts
// Stolen Phone Protection - device registration, heartbeats, theft-status checks
// and remote "mark as stolen". Phase 1 design:
//   - Device registers under the logged-in account.
//   - Foreground heartbeats carry last-known location while protection is on.
//   - /api/device/status is polled so the app learns it has been marked STOLEN
//     (from the dashboard or another device) and can enter silent helper mode.
//   - No covert camera, no OS-lockscreen interception (Android/iOS boundaries).

import { Platform, Linking, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import AuthService, { API_BASE_URL } from './AuthService';
import LocationService from './LocationService';
import { STORAGE_KEYS } from '../utils/constants';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes while app is open
const STATUS_POLL_INTERVAL_MS = 60 * 1000; // 1 minute while app is open
const INSTALL_ID_KEY = '@yc_install_id';

export type DeviceStatus = 'ACTIVE' | 'STOLEN' | 'RECOVERED' | 'UNPAIRED';
export type StealMode = 'silent' | 'helper' | 'none';

export interface StolenDeviceConfig {
  protectionEnabled: boolean;
  sendLocationEnabled: boolean;
  stealMode: StealMode;
  notifyDashboard: boolean;
  emergencyContactName: string;
  emergencyContactPhone: string;
  suspiciousThreshold: number;
}

export const DEFAULT_STOLEN_DEVICE_CONFIG: StolenDeviceConfig = {
  protectionEnabled: false,
  sendLocationEnabled: true,
  stealMode: 'silent',
  notifyDashboard: true,
  emergencyContactName: '',
  emergencyContactPhone: '',
  suspiciousThreshold: 3,
};

export interface StolenDeviceStatus {
  status: DeviceStatus;
  protectionEnabled: boolean;
  stealMode: StealMode;
  lastSeenAt: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  riskScore: number;
  markedStolenAt: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  activeTheftReport?: { ticketNumber?: string } | null;
}

export interface DeviceRecord {
  id: number;
  internalDeviceId: string;
  deviceName: string | null;
  platform: string | null;
  deviceModel: string | null;
  osVersion: string | null;
  appVersion: string | null;
  status: DeviceStatus;
  protectionEnabled: boolean;
  stealMode: StealMode;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  lastSeenAt: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastAddress: string | null;
  markedStolenAt: string | null;
  recoveredAt: string | null;
  activeTheftReport?: { ticketNumber?: string } | null;
  createdAt: string;
}

export interface StolenDeviceServiceListeners {
  onTheftDetected?: (status: StolenDeviceStatus) => void;
}

class StolenDeviceService {
  private config: StolenDeviceConfig = { ...DEFAULT_STOLEN_DEVICE_CONFIG };
  private installId: string | null = null;
  private listeners: StolenDeviceServiceListeners[] = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private statusTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSub: { remove: () => void } | null = null;
  private currentStatus: DeviceStatus = 'ACTIVE';
  private started = false;

  // ---------------------------------------------------------------------------
  // Identity + config
  // ---------------------------------------------------------------------------

  async getInstallId(): Promise<string> {
    if (this.installId) return this.installId;
    try {
      const stored = await AsyncStorage.getItem(INSTALL_ID_KEY);
      if (stored) {
        this.installId = stored;
        return stored;
      }
    } catch {
      // fall through to generate
    }
    const id = `yc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    this.installId = id;
    try {
      await AsyncStorage.setItem(INSTALL_ID_KEY, id);
    } catch {
      // non-fatal
    }
    return id;
  }

  async loadConfig(): Promise<StolenDeviceConfig> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.THIEF_DETECTION_CONFIG);
      if (raw) {
        this.config = { ...DEFAULT_STOLEN_DEVICE_CONFIG, ...JSON.parse(raw) };
      }
    } catch {
      // fall back to defaults
    }
    return { ...this.config };
  }

  async saveConfig(patch: Partial<StolenDeviceConfig>): Promise<StolenDeviceConfig> {
    this.config = { ...this.config, ...patch };
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THIEF_DETECTION_CONFIG, JSON.stringify(this.config));
    } catch {
      // non-fatal
    }
    return { ...this.config };
  }

  async getConfig(): Promise<StolenDeviceConfig> {
    return { ...this.config };
  }

  // ---------------------------------------------------------------------------
  // Device info helpers
  // ---------------------------------------------------------------------------

  private getDeviceMeta() {
    return {
      deviceName: Device.deviceName ?? undefined,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
      deviceModel: Device.modelName ?? undefined,
      osVersion: Device.osVersion ?? undefined,
      appVersion: undefined as string | undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // API calls
  // ---------------------------------------------------------------------------

  private async authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await AuthService.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  }

  async register(): Promise<DeviceRecord | null> {
    try {
      const id = await this.getInstallId();
      const meta = this.getDeviceMeta();
      const r = await this.authedFetch('/api/device/register', {
        method: 'POST',
        body: JSON.stringify({ internalDeviceId: id, ...meta }),
      });
      const data = await r.json();
      if (r.ok && data?.device) {
        this.applyServerConfig(data.device);
        return data.device;
      }
      console.warn('[StolenDevice] register failed', data?.error);
      return null;
    } catch (error) {
      console.warn('[StolenDevice] register error', error);
      return null;
    }
  }

  private applyServerConfig(device: {
    protectionEnabled?: boolean;
    sendLocationEnabled?: boolean;
    stealMode?: StealMode;
  }) {
    this.config = {
      ...this.config,
      protectionEnabled: device.protectionEnabled ?? this.config.protectionEnabled,
      sendLocationEnabled: device.sendLocationEnabled ?? this.config.sendLocationEnabled,
      stealMode: device.stealMode ?? this.config.stealMode,
    };
  }

  async syncPreferences(): Promise<boolean> {
    try {
      const id = await this.getInstallId();
      const r = await this.authedFetch('/api/device/preferences', {
        method: 'PUT',
        body: JSON.stringify({ internalDeviceId: id, ...this.config }),
      });
      return r.ok;
    } catch {
      return false;
    }
  }

  async sendHeartbeat(signals?: string[]): Promise<{ status: DeviceStatus } | null> {
    try {
      const id = await this.getInstallId();
      const loc = this.config.sendLocationEnabled ? LocationService.getCachedLocation() : null;
      const body: Record<string, unknown> = { internalDeviceId: id };
      if (loc?.latitude != null && loc?.longitude != null) {
        body.latitude = loc.latitude;
        body.longitude = loc.longitude;
        if (loc.accuracy != null) body.accuracy = loc.accuracy;
      }
      if (signals && signals.length > 0) body.signals = signals;
      const r = await this.authedFetch('/api/device/heartbeat', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (r.ok && data) {
        this.currentStatus = data.status ?? this.currentStatus;
        if (this.currentStatus === 'STOLEN') {
          this.notifyTheftDetected();
        }
        return { status: this.currentStatus };
      }
      return null;
    } catch {
      return null;
    }
  }

  async checkStatus(): Promise<StolenDeviceStatus | null> {
    try {
      const id = await this.getInstallId();
      const r = await this.authedFetch(`/api/device/status?internalDeviceId=${encodeURIComponent(id)}`);
      const data = await r.json();
      if (r.ok && data) {
        this.currentStatus = data.status ?? 'ACTIVE';
        if (this.currentStatus === 'STOLEN') {
          this.notifyTheftDetected();
        }
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }

  async listMyDevices(): Promise<DeviceRecord[]> {
    try {
      const r = await this.authedFetch('/api/device/my');
      const data = await r.json();
      return r.ok && Array.isArray(data?.devices) ? data.devices : [];
    } catch {
      return [];
    }
  }

  async markStolen(deviceId: number, description?: string): Promise<{ success: boolean; ticketNumber?: string; error?: string }> {
    try {
      const r = await this.authedFetch(`/api/device/my/${deviceId}/mark-stolen`, {
        method: 'POST',
        body: JSON.stringify({ description }),
      });
      const data = await r.json();
      if (r.ok) {
        this.currentStatus = 'STOLEN';
        return { success: true, ticketNumber: data.ticketNumber };
      }
      return { success: false, error: data?.error || 'Failed to mark device stolen' };
    } catch (error) {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  async recover(deviceId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const r = await this.authedFetch(`/api/device/my/${deviceId}/recover`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const data = await r.json();
      if (r.ok) {
        this.currentStatus = 'RECOVERED';
        return { success: true };
      }
      return { success: false, error: data?.error || 'Failed to recover device' };
    } catch (error) {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  async unpair(deviceId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const r = await this.authedFetch(`/api/device/my/${deviceId}`, { method: 'DELETE' });
      const data = await r.json();
      if (r.ok) return { success: true };
      return { success: false, error: data?.error || 'Failed to unpair device' };
    } catch (error) {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  // ---------------------------------------------------------------------------
  // Background loop (foreground-only heartbeats + status polling)
  // ---------------------------------------------------------------------------

  subscribe(listener: StolenDeviceServiceListeners): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyTheftDetected() {
    this.listeners.slice().forEach((l) => {
      try {
        l.onTheftDetected?.(this.currentStatus as unknown as StolenDeviceStatus);
      } catch {
        // noop
      }
    });
  }

  getStatus(): DeviceStatus {
    return this.currentStatus;
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    await this.loadConfig();
    const authed = await AuthService.isAuthenticated();
    if (!authed) return;

    const id = await this.getInstallId();
    // Fire and forget - never block app startup
    void this.register().then(() => {
      // capture a fresh location so the first heartbeat has coordinates
      if (this.config.sendLocationEnabled) {
        LocationService.getCurrentLocation().catch(() => null);
      }
    });

    const tick = () => {
      void this.sendHeartbeat();
    };
    const poll = () => {
      void this.checkStatus();
    };

    // Immediate first pass once the user is confirmed
    setTimeout(tick, 2000);
    setTimeout(poll, 1000);

    this.heartbeatTimer = setInterval(tick, HEARTBEAT_INTERVAL_MS);
    this.statusTimer = setInterval(poll, STATUS_POLL_INTERVAL_MS);

    this.appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void this.sendHeartbeat();
        void this.checkStatus();
      }
    });
  }

  async stop(): Promise<void> {
    this.started = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
    if (this.appStateSub) {
      this.appStateSub.remove();
      this.appStateSub = null;
    }
  }

  callEmergencyContact() {
    const phone = this.config.emergencyContactPhone;
    if (!phone) return;
    const tel = `tel:${phone.replace(/[^\d+]/g, '')}`;
    Linking.openURL(tel).catch(() => {});
  }
}

export default new StolenDeviceService();
