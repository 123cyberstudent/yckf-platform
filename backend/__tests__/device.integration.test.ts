import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import http from 'http';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/shared/db.js';
import app from '../src/app.js';
import { DEVICE_STATUS } from '../src/device/service.js';

const hasDb = Boolean(process.env.DATABASE_URL);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-do-not-use-in-production';

function listen() {
  return new Promise<number>((resolve) => {
    const s = http.createServer(app).listen(0, () => resolve((s.address() as any).port));
  });
}

function sign(userId: number, role = 'USER') {
  return jwt.sign({ sub: String(userId), role, email: 'x', type: 'access' }, JWT_SECRET, { expiresIn: '1h' });
}

describe.skipIf(!hasDb)('Stolen Device Protection (live dev DB)', () => {
  const runId = `${Date.now()}`;
  const userIds: number[] = [];
  let user: { id: number; email: string };
  let adminUser: { id: number; email: string };
  let port = 0;
  let token = '';
  let adminToken = '';
  const internalDeviceId = `dev-${runId}`;
  let deviceId = 0;

  beforeAll(async () => {
    port = await listen();
    const passwordHash = await bcrypt.hash('TestPass123!', 4);
    user = await prisma.user.create({
      data: { email: `dev-${runId}@test.local`, fullName: 'Device Owner', passwordHash, role: 'USER' },
    });
    adminUser = await prisma.user.create({
      data: { email: `dev-admin-${runId}@test.local`, fullName: 'Device Admin', passwordHash, role: 'ADMIN' },
    });
    userIds.push(user.id, adminUser.id);
    token = createAccessToken(user.id, 'USER');
    adminToken = createAccessToken(adminUser.id, 'ADMIN');
  });

  function createAccessToken(id: number, role: string) {
    return sign(id, role);
  }

  afterAll(async () => {
    await prisma.deviceHeartbeat.deleteMany({ where: { device: { userId: { in: userIds } } } }).catch(() => undefined);
    await prisma.stolenDeviceReport.deleteMany({ where: { device: { userId: { in: userIds } } } }).catch(() => undefined);
    await prisma.device.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
    await prisma.notification.deleteMany({ where: { recipientId: { in: userIds } } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  function authHeaders(t: string) {
    return { Authorization: `Bearer ${t}` };
  }

  describe('device lifecycle', () => {
    it('requires auth to register', async () => {
      const r = await fetch(`http://localhost:${port}/api/device/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalDeviceId }),
      });
      expect(r.status).toBe(401);
    });

    it('registers a device', async () => {
      const r = await fetch(`http://localhost:${port}/api/device/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ internalDeviceId, deviceName: 'Pixel Test', platform: 'ANDROID' }),
      });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.success).toBe(true);
      expect(body.device.internalDeviceId).toBe(internalDeviceId);
      expect(body.device.status).toBe(DEVICE_STATUS.ACTIVE);
      deviceId = body.device.id;
    });

    it('defaults a freshly-registered device to protection off (no silent activation)', async () => {
      const freshId = `fresh-${runId}`;
      const r = await fetch(`http://localhost:${port}/api/device/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ internalDeviceId: freshId }),
      });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.device.protectionEnabled).toBe(false);
      await prisma.device.deleteMany({ where: { internalDeviceId: freshId, userId: user.id } }).catch(() => undefined);
    });

    it('preferences self-heal by registering an unknown device instead of 404ing', async () => {
      const healId = `heal-${runId}`;
      const r = await fetch(`http://localhost:${port}/api/device/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ internalDeviceId: healId, protectionEnabled: true, stealMode: 'silent' }),
      });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.success).toBe(true);
      expect(body.device.protectionEnabled).toBe(true);

      const created = await prisma.device.findUnique({
        where: { userId_internalDeviceId: { userId: user.id, internalDeviceId: healId } },
      });
      expect(created).not.toBeNull();
      expect(created!.protectionEnabled).toBe(true);
      await prisma.deviceHeartbeat.deleteMany({ where: { deviceId: created!.id } }).catch(() => undefined);
      await prisma.device.deleteMany({ where: { internalDeviceId: healId, userId: user.id } }).catch(() => undefined);
    });

    it('lists my devices', async () => {
      const r = await fetch(`http://localhost:${port}/api/device/my`, { headers: authHeaders(token) });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(Array.isArray(body.devices)).toBe(true);
      expect(body.devices.some((d: { internalDeviceId: string }) => d.internalDeviceId === internalDeviceId)).toBe(true);
    });

    it('records a heartbeat with location', async () => {
      const r = await fetch(`http://localhost:${port}/api/device/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ internalDeviceId, latitude: 5.6037, longitude: -0.187, accuracy: 12 }),
      });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.status).toBe(DEVICE_STATUS.ACTIVE);
      expect(body.riskScore).toBe(0);

      const after = await prisma.device.findUnique({ where: { id: deviceId } });
      expect(after!.lastLatitude).toBe(5.6037);
      expect(after!.lastLongitude).toBe(-0.187);
      const hb = await prisma.deviceHeartbeat.count({ where: { deviceId } });
      expect(hb).toBeGreaterThan(0);
    });

    it('returns 404 for an unknown device heartbeat', async () => {
      const r = await fetch(`http://localhost:${port}/api/device/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ internalDeviceId: 'missing-device' }),
      });
      expect(r.status).toBe(404);
    });

    it('owner marks the device stolen -> theft report created + admin notified', async () => {
      const r = await fetch(`http://localhost:${port}/api/device/my/${deviceId}/mark-stolen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ description: 'Lost during transit' }),
      });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.success).toBe(true);
      expect(body.ticketNumber).toMatch(/^YCKF-THF-/);
      expect(body.status).toBe(DEVICE_STATUS.STOLEN);

      const after = await prisma.device.findUnique({ where: { id: deviceId } });
      expect(after!.status).toBe(DEVICE_STATUS.STOLEN);

      const report = await prisma.stolenDeviceReport.findFirst({
        where: { deviceId, status: 'open' },
      });
      expect(report).not.toBeNull();
      expect(report!.ticketNumber).toBe(body.ticketNumber);

      const notif = await prisma.notification.findFirst({
        where: { recipientId: adminUser.id, type: 'alert' },
        orderBy: { createdAt: 'desc' },
      });
      expect(notif).not.toBeNull();
      expect(notif!.title).toContain('stolen');
    });

    it('owner cannot mark another users device stolen', async () => {
      const r = await fetch(`http://localhost:${port}/api/device/my/9999999/mark-stolen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({}),
      });
      expect(r.status).toBe(404);
    });

    it('a heartbeated device that is STOLEN returns STOLEN status', async () => {
      const r = await fetch(`http://localhost:${port}/api/device/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ internalDeviceId, latitude: 5.62, longitude: -0.19 }),
      });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.status).toBe(DEVICE_STATUS.STOLEN);
    });

    it('owner recovers a device and resolves the open theft report', async () => {
      const r = await fetch(`http://localhost:${port}/api/device/my/${deviceId}/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({}),
      });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.status).toBe(DEVICE_STATUS.RECOVERED);

      const after = await prisma.device.findUnique({ where: { id: deviceId } });
      expect(after!.status).toBe(DEVICE_STATUS.RECOVERED);
      const open = await prisma.stolenDeviceReport.count({ where: { deviceId, status: 'open' } });
      expect(open).toBe(0);
      const resolved = await prisma.stolenDeviceReport.count({ where: { deviceId, status: 'resolved' } });
      expect(resolved).toBeGreaterThan(0);
    });

    it('staff can list devices and mark any device stolen', async () => {
      const r = await fetch(`http://localhost:${port}/api/device?page=1&limit=50`, { headers: authHeaders(adminToken) });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.success).toBe(true);
      const found = body.devices.find((d: { id: number }) => d.id === deviceId);
      expect(found).toBeDefined();

      const r2 = await fetch(`http://localhost:${port}/api/device/${deviceId}/mark-stolen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(adminToken) },
        body: JSON.stringify({ description: 'Staff confirmed lost' }),
      });
      expect(r2.status).toBe(200);
      const theft = await prisma.device.findUnique({ where: { id: deviceId } });
      expect(theft!.status).toBe(DEVICE_STATUS.STOLEN);
    });

    it('staff lists theft reports', async () => {
      const r = await fetch(`http://localhost:${port}/api/device/theft-reports?page=1&limit=10`, { headers: authHeaders(adminToken) });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.reports)).toBe(true);
    });

    it('non-staff cannot list devices', async () => {
      const r = await fetch(`http://localhost:${port}/api/device`, { headers: authHeaders(token) });
      expect(r.status).toBe(403);
    });
  });
});