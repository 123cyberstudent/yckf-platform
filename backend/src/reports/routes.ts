import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { verifyToken, isAdmin } from '../auth/middleware.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, address, incidentDate, incidentTime, incidentType, description, location, reporterLocation } = req.body;

    if (!fullName || !email || !incidentType || !description) {
      return res.status(400).json({ error: 'fullName, email, incidentType, and description are required' });
    }

    if (description.length > 5000) {
      return res.status(400).json({ error: 'Description too long (max 5000 characters)' });
    }

    let systemUser = await prisma.user.findFirst({ where: { email: 'system@yckf.internal' } });
    if (!systemUser) {
      const bcrypt = await import('bcryptjs');
      systemUser = await prisma.user.create({
        data: {
          email: 'system@yckf.internal',
          fullName: 'System',
          passwordHash: await bcrypt.hash('system-' + Date.now(), 10),
          role: 'USER',
        },
      });
    }

    const gpsAddress = reporterLocation?.gpsAddress || '';
    const resolvedLocation = location || gpsAddress || '';

    const report = await prisma.report.create({
      data: {
        userId: systemUser.id,
        title: `[Public Report] ${incidentType}`,
        description: JSON.stringify({
          fullName,
          email,
          phone: phone || '',
          address: address || '',
          incidentDate: incidentDate || '',
          incidentTime: incidentTime || '',
          location: location || '',
          description,
          submittedAt: new Date().toISOString(),
          reporterLocation: reporterLocation ? {
            latitude: reporterLocation.latitude,
            longitude: reporterLocation.longitude,
            accuracy: reporterLocation.accuracy,
            gpsAddress: reporterLocation.gpsAddress || '',
            locationName: reporterLocation.locationName || '',
            nearestLandmark: reporterLocation.nearestLandmark || '',
            googleMapLink: reporterLocation.googleMapLink || '',
          } : null,
        }),
        incidentType,
        priority: 'high',
        status: 'new',
        location: resolvedLocation,
      },
    });

    res.status(201).json({ success: true, reportId: report.id });
  } catch (err) {
    console.error('Failed to submit report');
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

router.get('/', verifyToken, isAdmin, async (_req: Request, res: Response) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: { cases: true },
    });
    res.json(reports);
  } catch (err) {
    console.error('Failed to list reports');
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

router.get('/:id', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: Number(req.params.id) },
      include: { cases: true },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) {
    console.error('Failed to get report');
    res.status(500).json({ error: 'Failed to get report' });
  }
});

router.put('/:id/status', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const valid = ['new', 'under_review', 'in_progress', 'resolved', 'closed'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
    }
    const report = await prisma.report.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });
    res.json(report);
  } catch (err) {
    console.error('Failed to update report status');
    res.status(500).json({ error: 'Failed to update report status' });
  }
});

router.delete('/:id', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.report.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete report');
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;
