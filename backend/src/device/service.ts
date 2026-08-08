import { prisma } from '../shared/db.js';
import { generateTicketNumber } from '../shared/tickets.js';
import { sendAdminNotification } from '../email/service.js';
import { notifyAdmins } from '../notifications/service.js';
import { emitToStaff } from '../shared/socket.js';
import { logAudit } from '../audit/service.js';

const dashboardBase = () => process.env.DASHBOARD_URL || 'https://yckf-admin-dashboard-production.up.railway.app';

export const DEVICE_STATUS = {
  ACTIVE: 'ACTIVE',
  STOLEN: 'STOLEN',
  RECOVERED: 'RECOVERED',
  UNPAIRED: 'UNPAIRED',
} as const;

// Theft risk weights for supported suspicious signals (Phase 1: heartbeat-based
// signals only — no covert camera, no OS-lockscreen interception).
const SIGNAL_WEIGHTS: Record<string, number> = {
  sim_change: 30,
  location_moved: 20,
  account_security_event: 25,
  multiple_app_resets: 25,
};

function buildMapsLink(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Upsert a device from a mobile heartbeat/registration call. Returns the device
 * row plus whether it is currently STOLEN so the app can enter helper mode.
 */
export async function upsertDevice(input: {
  userId: number;
  internalDeviceId: string;
  deviceName?: string;
  platform?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  protectionEnabled?: boolean;
  sendLocationEnabled?: boolean;
  stealMode?: string;
  notifyDashboard?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  suspiciousThreshold?: number;
}) {
  const existing = await prisma.device.findUnique({
    where: { userId_internalDeviceId: { userId: input.userId, internalDeviceId: input.internalDeviceId } },
  });

  const data = {
    deviceName: input.deviceName ?? existing?.deviceName,
    platform: input.platform ?? existing?.platform ?? 'ANDROID',
    deviceModel: input.deviceModel ?? existing?.deviceModel,
    osVersion: input.osVersion ?? existing?.osVersion,
    appVersion: input.appVersion ?? existing?.appVersion,
    protectionEnabled: input.protectionEnabled ?? existing?.protectionEnabled ?? false,
    sendLocationEnabled: input.sendLocationEnabled ?? existing?.sendLocationEnabled ?? true,
    stealMode: input.stealMode ?? existing?.stealMode ?? 'silent',
    notifyDashboard: input.notifyDashboard ?? existing?.notifyDashboard ?? true,
    emergencyContactName: input.emergencyContactName ?? existing?.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone ?? existing?.emergencyContactPhone,
    suspiciousThreshold: input.suspiciousThreshold ?? existing?.suspiciousThreshold ?? 3,
  };

  const device = await prisma.device.upsert({
    where: { userId_internalDeviceId: { userId: input.userId, internalDeviceId: input.internalDeviceId } },
    update: { ...data, updatedAt: new Date() },
    create: { ...data, userId: input.userId, internalDeviceId: input.internalDeviceId },
  });

  return device;
}

/**
 * Record a heartbeat (location/proximity beacon) and evaluate the suspicious
 * event signals carried in the request. When accumulated risk crosses the user
 * threshold, promote the device to STOLEN and create a theft report.
 */
export async function recordHeartbeat(input: {
  userId: number;
  internalDeviceId: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  address?: string | null;
  battery?: number | null;
  signals?: string[];
}) {
  const device = await prisma.device.findUnique({
    where: { userId_internalDeviceId: { userId: input.userId, internalDeviceId: input.internalDeviceId } },
  });
  if (!device) {
    return { error: 'Device not registered', status: 404 };
  }

  const lat = typeof input.latitude === 'number' && !Number.isNaN(input.latitude) ? input.latitude : null;
  const lng = typeof input.longitude === 'number' && !Number.isNaN(input.longitude) ? input.longitude : null;

  await prisma.deviceHeartbeat.create({
    data: {
      deviceId: device.id,
      latitude: lat,
      longitude: lng,
      accuracy: typeof input.accuracy === 'number' ? input.accuracy : null,
      address: input.address || null,
      battery: typeof input.battery === 'number' ? input.battery : null,
    },
  });

  const prevRiskSignals: Record<string, number> =
    typeof device.riskSignals === 'object' && device.riskSignals !== null
      ? (device.riskSignals as Record<string, number>)
      : {};
  const nextSignals: Record<string, number> = { ...prevRiskSignals };
  for (const signalName of input.signals ?? []) {
    nextSignals[signalName] = (nextSignals[signalName] ?? 0) + 1;
  }
  const riskScore = Object.entries(nextSignals).reduce(
    (sum, [name, count]) => sum + (SIGNAL_WEIGHTS[name] ?? 0) * count,
    0
  );

  const threshold = device.suspiciousThreshold ?? 3;
  const shouldEscalate = device.status !== DEVICE_STATUS.STOLEN && riskScore >= threshold * 10;

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: {
      lastSeenAt: new Date(),
      lastLatitude: lat,
      lastLongitude: lng,
      lastAddress: input.address || device.lastAddress,
      lastAccuracy: typeof input.accuracy === 'number' ? input.accuracy : device.lastAccuracy,
      riskScore,
      riskSignals: nextSignals,
      ...(shouldEscalate
        ? { status: DEVICE_STATUS.STOLEN, markedStolenAt: new Date() }
        : {}),
    },
  });

  let theftReport = null;
  if (shouldEscalate) {
    theftReport = await openTheftReport({
      device,
      userId: input.userId,
      trigger: 'suspicious_events',
      description: `Risk score reached ${riskScore}, crossing the suspicious-event threshold.`,
      latitude: lat,
      longitude: lng,
      address: input.address || undefined,
      reportedByUserId: input.userId,
      riskLevel: loadRiskLevelForScore(riskScore),
    });
  }

  return {
    status: updated.status,
    riskScore,
    theftReport,
    deviceId: updated.id,
    lastSeenAt: updated.lastSeenAt,
  };
}

function loadRiskLevelForScore(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 100) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

/**
 * Create (idempotently, once per starting-from-ACTIVE transition) a theft
 * report for a device being marked STOLEN and fan out to admins in-app, via
 * email, and via Socket.IO to live dashboards.
 */
export async function openTheftReport(input: {
  device: { id: number; userId: number; deviceName: string | null; internalDeviceId: string };
  userId: number;
  trigger?: string;
  description?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  reportedByUserId?: number | null;
}) {
  const existingOpen = await prisma.stolenDeviceReport.findFirst({
    where: { deviceId: input.device.id, status: { in: ['open', 'investigating'] } },
  });
  if (existingOpen) {
    return existingOpen;
  }

  const ticketNumber = await generateTicketNumber('theft');
  const riskLevel = input.riskLevel ?? 'HIGH';

  const report = await prisma.stolenDeviceReport.create({
    data: {
      ticketNumber,
      userId: input.userId,
      deviceId: input.device.id,
      status: 'open',
      trigger: input.trigger ?? 'manual',
      description: input.description || null,
      riskLevel,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      address: input.address ?? null,
      reportedByUserId: input.reportedByUserId ?? null,
    },
  });

  const mapsLink = buildMapsLink(input.latitude, input.longitude);
  const deviceLabel = input.device.deviceName || input.device.internalDeviceId;

  await notifyAdmins({
    type: 'alert',
    title: 'Device reported stolen',
    body: `${deviceLabel} was reported stolen (${ticketNumber}). Last seen ${mapsLink ?? 'location unavailable'}.`,
    link: `${dashboardBase()}/dashboard/devices`,
  }).catch(() => {});

  emitToStaff('theft:new', {
    id: report.id,
    ticketNumber,
    deviceLabel,
    status: 'open',
    riskLevel,
    latitude: input.latitude,
    longitude: input.longitude,
    mapsLink,
    createdAt: report.createdAt,
  });

  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #b91c1c; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">🚨 DEVICE REPORTED STOLEN</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Ticket: ${ticketNumber}</p>
      </div>
      <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Device</td><td style="padding: 8px;">${deviceLabel}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Risk Level</td><td style="padding: 8px;">${riskLevel}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Trigger</td><td style="padding: 8px;">${input.trigger ?? 'manual'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">GPS</td><td style="padding: 8px;">${input.latitude ?? 'N/A'}, ${input.longitude ?? 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Maps</td><td style="padding: 8px;">${mapsLink || 'Not available'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Address</td><td style="padding: 8px;">${input.address || 'Not available'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Reported At</td><td style="padding: 8px;">${new Date().toISOString()}</td></tr>
        </table>
      </div>
    </div>
  `;

  sendAdminNotification({
    ticketNumber,
    reportType: 'theft',
    subject: `🚨 DEVICE REPORTED STOLEN - ${ticketNumber}`,
    html: adminHtml,
  }).catch(() => {});

  await logAudit(input.reportedByUserId ?? input.userId, 'device.report_stolen', report.id, '', {
    entityType: 'stolen_device_report',
    entityId: report.id,
    newValue: { ticketNumber, internal: input.device.internalDeviceId, trigger: input.trigger ?? 'manual' },
  }).catch(() => {});

  return report;
}