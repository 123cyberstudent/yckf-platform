import { Router, Response } from 'express';
import { prisma } from '../shared/db.js';
import { verifyToken, isStaff, AuthRequest } from '../auth/middleware.js';
import { reportSubmissionLimiter } from '../shared/rateLimiter.js';
import { upsertDevice, recordHeartbeat, openTheftReport, DEVICE_STATUS } from './service.js';

const router = Router();

function parseFloatOpt(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function parseSignals(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : undefined;
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(value)) {
    return value.filter((s) => typeof s === 'string');
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// App-facing endpoints (mobile)
// ---------------------------------------------------------------------------

/** Register / refresh this device under the authenticated account. */
router.post('/register', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { internalDeviceId, deviceName, platform, deviceModel, osVersion, appVersion } = req.body;
    if (!req.user || !internalDeviceId || typeof internalDeviceId !== 'string') {
      return res.status(400).json({ error: 'internalDeviceId is required' });
    }

    const device = await upsertDevice({
      userId: req.user.id,
      internalDeviceId,
      deviceName: deviceName || undefined,
      platform: platform || undefined,
      deviceModel: deviceModel || undefined,
      osVersion: osVersion || undefined,
      appVersion: appVersion || undefined,
    });

    res.status(200).json({
      success: true,
      device: {
        id: device.id,
        internalDeviceId: device.internalDeviceId,
        status: device.status,
        deviceName: device.deviceName,
        platform: device.platform,
        protectionEnabled: device.protectionEnabled,
        sendLocationEnabled: device.sendLocationEnabled,
        stealMode: device.stealMode,
      },
    });
  } catch (err) {
    console.error('Failed to register device:', err);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

/**
 * Update device preferences (protection toggle, emergency contact, thresholds).
 * The app pushes the full desired state; missing fields are left untouched.
 */
router.put('/preferences', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { internalDeviceId } = req.body;
    if (!req.user || !internalDeviceId || typeof internalDeviceId !== 'string') {
      return res.status(400).json({ error: 'internalDeviceId is required' });
    }

    const patch: Record<string, unknown> = {};
    if (typeof req.body.protectionEnabled === 'boolean') patch.protectionEnabled = req.body.protectionEnabled;
    if (typeof req.body.sendLocationEnabled === 'boolean') patch.sendLocationEnabled = req.body.sendLocationEnabled;
    if (typeof req.body.stealMode === 'string') patch.stealMode = req.body.stealMode;
    if (typeof req.body.notifyDashboard === 'boolean') patch.notifyDashboard = req.body.notifyDashboard;
    if (typeof req.body.emergencyContactName === 'string') patch.emergencyContactName = req.body.emergencyContactName;
    if (typeof req.body.emergencyContactPhone === 'string') patch.emergencyContactPhone = req.body.emergencyContactPhone;
    if (typeof req.body.suspiciousThreshold === 'number') patch.suspiciousThreshold = req.body.suspiciousThreshold;

    let device = await prisma.device.findUnique({
      where: { userId_internalDeviceId: { userId: req.user.id, internalDeviceId } },
    });

    // Self-heal: a preferences write implies the app wants this device
    // registered under the account. If the startup registration was skipped
    // (user not yet signed in) or failed silently, register it now instead of
    // returning 404 and leaving the UI in a "PROTECTION ACTIVE" state that
    // has no backing record on the server.
    if (!device) {
      device = await upsertDevice({
        userId: req.user.id,
        internalDeviceId,
        deviceName: typeof req.body.deviceName === 'string' ? req.body.deviceName : undefined,
        platform: typeof req.body.platform === 'string' ? req.body.platform : undefined,
        ...(patch as {
          protectionEnabled?: boolean;
          sendLocationEnabled?: boolean;
          stealMode?: string;
          notifyDashboard?: boolean;
          emergencyContactName?: string;
          emergencyContactPhone?: string;
          suspiciousThreshold?: number;
        }),
      });
    }

    const updated = await prisma.device.update({ where: { id: device.id }, data: patch });

    res.status(200).json({ success: true, device: updated });
  } catch (err) {
    console.error('Failed to update device preferences:', err);
    res.status(500).json({ error: 'Failed to update device preferences' });
  }
});

/**
 * Heartbeat from the app: updates last-seen + location and evaluates any
 * suspicious-event signals. Also the response the app uses to learn whether it
 * has been marked STOLEN (status -> STOLEN triggers helper mode on-device).
 */
router.post('/heartbeat', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { internalDeviceId, latitude, longitude, accuracy, address, battery, signals } = req.body;
    if (!req.user || !internalDeviceId || typeof internalDeviceId !== 'string') {
      return res.status(400).json({ error: 'internalDeviceId is required' });
    }

    const result = await recordHeartbeat({
      userId: req.user.id,
      internalDeviceId,
      latitude: parseFloatOpt(latitude),
      longitude: parseFloatOpt(longitude),
      accuracy: parseFloatOpt(accuracy),
      address: typeof address === 'string' ? address : null,
      battery: parseFloatOpt(battery),
      signals: parseSignals(signals),
    });

    if ('error' in result) {
      return res.status(result.status as number).json({ error: result.error });
    }

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('Failed to process heartbeat:', err);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

/** Current status + preferences for a single protected device. */
router.get('/status', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const internalDeviceId = String(req.query.internalDeviceId || '');
    if (!req.user || !internalDeviceId) {
      return res.status(400).json({ error: 'internalDeviceId is required' });
    }

    const device = await prisma.device.findUnique({
      where: { userId_internalDeviceId: { userId: req.user.id, internalDeviceId } },
      include: {
        theftReports: {
          where: { status: { in: ['open', 'investigating'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!device) {
      return res.status(404).json({ error: 'Device not registered' });
    }

    res.status(200).json({
      success: true,
      status: device.status,
      protectionEnabled: device.protectionEnabled,
      stealMode: device.stealMode,
      lastSeenAt: device.lastSeenAt,
      lastLatitude: device.lastLatitude,
      lastLongitude: device.lastLongitude,
      riskScore: device.riskScore,
      riskSignals: device.riskSignals,
      markedStolenAt: device.markedStolenAt,
      emergencyContactName: device.emergencyContactName,
      emergencyContactPhone: device.emergencyContactPhone,
      activeTheftReport: device.theftReports[0] ?? null,
    });
  } catch (err) {
    console.error('Failed to get device status:', err);
    res.status(500).json({ error: 'Failed to get device status' });
  }
});

/** List all devices registered to the authenticated account. */
router.get('/my', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const devices = await prisma.device.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        theftReports: {
          where: { status: { in: ['open', 'investigating'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    res.status(200).json({
      success: true,
      devices: devices.map((d) => ({
        id: d.id,
        internalDeviceId: d.internalDeviceId,
        deviceName: d.deviceName,
        platform: d.platform,
        deviceModel: d.deviceModel,
        osVersion: d.osVersion,
        appVersion: d.appVersion,
        status: d.status,
        protectionEnabled: d.protectionEnabled,
        stealMode: d.stealMode,
        emergencyContactName: d.emergencyContactName,
        emergencyContactPhone: d.emergencyContactPhone,
        lastSeenAt: d.lastSeenAt,
        lastLatitude: d.lastLatitude,
        lastLongitude: d.lastLongitude,
        lastAddress: d.lastAddress,
        markedStolenAt: d.markedStolenAt,
        recoveredAt: d.recoveredAt,
        activeTheftReport: d.theftReports[0] ?? null,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    console.error('Failed to list my devices:', err);
    res.status(500).json({ error: 'Failed to list devices' });
  }
});

/**
 * Owner marks one of their devices as STOLEN. Works from another device or the
 * web dashboard, and is the primary "report stolen" action in the design.
 */
router.post('/my/:deviceId/mark-stolen', verifyToken, reportSubmissionLimiter, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const deviceId = Number(req.params.deviceId);
    const device = await prisma.device.findFirst({ where: { id: deviceId, userId: req.user.id } });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { status: DEVICE_STATUS.STOLEN, markedStolenAt: new Date() },
    });

    const report = await openTheftReport({
      device,
      userId: req.user.id,
      trigger: 'manual',
      description: typeof req.body.description === 'string' ? req.body.description : undefined,
      latitude: device.lastLatitude,
      longitude: device.lastLongitude,
      address: device.lastAddress,
      reportedByUserId: req.user.id,
    });

    res.status(200).json({ success: true, ticketNumber: report.ticketNumber, status: DEVICE_STATUS.STOLEN });
  } catch (err) {
    console.error('Failed to mark device stolen:', err);
    res.status(500).json({ error: 'Failed to mark device stolen' });
  }
});

/** Owner marks one of their devices as recovered. */
router.post('/my/:deviceId/recover', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const deviceId = Number(req.params.deviceId);
    const device = await prisma.device.findFirst({ where: { id: deviceId, userId: req.user.id } });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { status: DEVICE_STATUS.RECOVERED, recoveredAt: new Date(), markedStolenAt: null },
    });
    await prisma.stolenDeviceReport.updateMany({
      where: { deviceId: device.id, status: { in: ['open', 'investigating'] } },
      data: { status: 'resolved', updatedAt: new Date() },
    });

    res.status(200).json({ success: true, status: DEVICE_STATUS.RECOVERED });
  } catch (err) {
    console.error('Failed to recover device:', err);
    res.status(500).json({ error: 'Failed to recover device' });
  }
});

/** Owner unpairs (removes) a device from the account. */
router.delete('/my/:deviceId', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const deviceId = Number(req.params.deviceId);
    const device = await prisma.device.findFirst({ where: { id: deviceId, userId: req.user.id } });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await prisma.stolenDeviceReport.updateMany({
      where: { deviceId: device.id, status: { in: ['open', 'investigating'] } },
      data: { status: 'closed', updatedAt: new Date() },
    });
    await prisma.device.update({
      where: { id: device.id },
      data: { status: DEVICE_STATUS.UNPAIRED },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Failed to unpair device:', err);
    res.status(500).json({ error: 'Failed to unpair device' });
  }
});

// ---------------------------------------------------------------------------
// Staff-facing endpoints (web dashboard)
// ---------------------------------------------------------------------------

/** List all protected devices across accounts (staff). */
router.get('/', verifyToken, isStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '50', search } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
    const where: Record<string, unknown> = {};
    if (status && typeof status === 'string') where.status = status;
    if (search && typeof search === 'string') {
      where.OR = [
        { deviceName: { contains: search, mode: 'insensitive' as const } },
        { internalDeviceId: { contains: search, mode: 'insensitive' as const } },
        { user: { email: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [total, devices] = await Promise.all([
      prisma.device.count({ where }),
      prisma.device.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: { user: { select: { id: true, email: true, fullName: true, phone: true } } },
      }),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      devices: devices.map((d) => ({
        id: d.id,
        internalDeviceId: d.internalDeviceId,
        deviceName: d.deviceName,
        platform: d.platform,
        deviceModel: d.deviceModel,
        osVersion: d.osVersion,
        appVersion: d.appVersion,
        status: d.status,
        protectionEnabled: d.protectionEnabled,
        stealMode: d.stealMode,
        riskScore: d.riskScore,
        riskSignals: d.riskSignals,
        lastSeenAt: d.lastSeenAt,
        lastLatitude: d.lastLatitude,
        lastLongitude: d.lastLongitude,
        lastAddress: d.lastAddress,
        markedStolenAt: d.markedStolenAt,
        recoveredAt: d.recoveredAt,
        createdAt: d.createdAt,
        owner: d.user,
      })),
    });
  } catch (err) {
    console.error('Failed to list devices:', err);
    res.status(500).json({ error: 'Failed to list devices' });
  }
});

/** Staff marks any device as STOLEN. */
router.post('/:deviceId/mark-stolen', verifyToken, isStaff, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const deviceId = Number(req.params.deviceId);
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { status: DEVICE_STATUS.STOLEN, markedStolenAt: new Date() },
    });

    const report = await openTheftReport({
      device,
      userId: device.userId,
      trigger: 'manual',
      description: typeof req.body.description === 'string' ? req.body.description : 'Marked stolen by YCKF staff',
      latitude: device.lastLatitude,
      longitude: device.lastLongitude,
      address: device.lastAddress,
      reportedByUserId: req.user.id,
    });

    res.status(200).json({ success: true, ticketNumber: report.ticketNumber, status: DEVICE_STATUS.STOLEN });
  } catch (err) {
    console.error('Failed to mark device stolen:', err);
    res.status(500).json({ error: 'Failed to mark device stolen' });
  }
});

/** Staff marks any device as recovered. */
router.post('/:deviceId/recover', verifyToken, isStaff, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const deviceId = Number(req.params.deviceId);
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { status: DEVICE_STATUS.RECOVERED, recoveredAt: new Date(), markedStolenAt: null },
    });
    await prisma.stolenDeviceReport.updateMany({
      where: { deviceId: device.id, status: { in: ['open', 'investigating'] } },
      data: { status: 'resolved', updatedAt: new Date() },
    });

    res.status(200).json({ success: true, status: DEVICE_STATUS.RECOVERED });
  } catch (err) {
    console.error('Failed to recover device:', err);
    res.status(500).json({ error: 'Failed to recover device' });
  }
});

/** List theft reports (staff). */
router.get('/theft-reports', verifyToken, isStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '50' } = req.query as { status?: string; page?: string; limit?: string };
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
    const where = status ? { status } : {};
    const [total, reports] = await Promise.all([
      prisma.stolenDeviceReport.count({ where }),
      prisma.stolenDeviceReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          device: { select: { id: true, internalDeviceId: true, deviceName: true, platform: true } },
          user: { select: { id: true, email: true, fullName: true, phone: true } },
        },
      }),
    ]);

    res.status(200).json({ success: true, total, page: pageNum, limit: limitNum, reports });
  } catch (err) {
    console.error('Failed to list theft reports:', err);
    res.status(500).json({ error: 'Failed to list theft reports' });
  }
});

export default router;
