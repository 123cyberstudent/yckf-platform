import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import multer from 'multer';
import { Request, Response, Router } from 'express';
import { body, param } from 'express-validator';
import { verifyToken, isAdmin, isInvestigator, AuthRequest } from '../auth/middleware.js';
import { prisma } from '../shared/db.js';
import { validateRequest } from '../utils/validators.js';
import { computeHash, generateFilename, getUploadPath, saveFile, validateFileType } from '../shared/file.js';
import { logAudit } from '../audit/service.js';
import { createNotification } from '../notifications/service.js';
import { evidenceUploadLimiter } from '../shared/rateLimiter.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/', verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const evidence = await prisma.evidence.findMany({
      include: { report: true, uploadedBy: { select: { id: true, email: true, fullName: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json({ evidence });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load evidence' });
  }
});

router.post(
  '/upload',
  verifyToken,
  evidenceUploadLimiter,
  upload.single('file'),
  [body('reportId').isInt().withMessage('reportId is required')],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
      }
      const reportId = Number(req.body.reportId);
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }
      if (req.user!.role === 'INVESTIGATOR' || req.user!.role === 'VOLUNTEER') {
        const assignedCase = await prisma.case.findFirst({ where: { reportId, assignedInvestigatorId: req.user!.id } });
        if (!assignedCase) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      if (req.user!.role === 'USER' && report.userId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { extension, mimeType } = await validateFileType(req.file);
      const fileName = generateFilename(extension);
      const filePath = await saveFile(fileName, req.file.buffer);
      const fileHash = computeHash(req.file.buffer);
      const evidence = await prisma.evidence.create({
        data: {
          reportId,
          fileUrl: fileName,
          fileHash,
          fileType: mimeType,
          metadata: {
            originalName: req.file.originalname,
            mimeType,
            size: req.file.size,
          },
          uploadedById: req.user!.id,
        },
      });

      const caseItem = await prisma.case.findFirst({ where: { reportId }, include: { assignedInvestigator: true } });
      if (caseItem?.assignedInvestigatorId) {
        await createNotification({
          recipientId: caseItem.assignedInvestigatorId,
          senderId: req.user!.id,
          type: 'new_evidence',
          title: 'New Evidence Uploaded',
          body: `New evidence was uploaded for case #${caseItem.id}.`,
          link: `/cases/${caseItem.id}/evidence`,
          caseId: caseItem.id,
        });
      }
      await logAudit(req.user!.id, 'upload evidence', evidence.id, String(req.ip));
      res.status(201).json(evidence);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to upload evidence' });
    }
  }
);

router.get('/case/:caseId', verifyToken, [param('caseId').isInt().withMessage('Case ID is required')], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const caseId = Number(req.params.caseId);
    const caseItem = await prisma.case.findUnique({ where: { id: caseId }, include: { report: true } });
    if (!caseItem) {
      return res.status(404).json({ error: 'Case not found' });
    }
    if (req.user!.role === 'INVESTIGATOR' || req.user!.role === 'VOLUNTEER') {
      if (caseItem.assignedInvestigatorId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    if (req.user!.role === 'USER' && caseItem.report.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const evidence = await prisma.evidence.findMany({ where: { reportId: caseItem.reportId } });
    await logAudit(req.user!.id, 'view evidence list', caseId, String(req.ip));
    res.json({ evidence });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load evidence' });
  }
});

router.get('/:id/download', verifyToken, [param('id').isInt().withMessage('Evidence ID is required')], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const evidenceId = Number(req.params.id);
    const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId }, include: { report: true } });
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }
    if (req.user!.role === 'INVESTIGATOR' || req.user!.role === 'VOLUNTEER') {
      const assignedCase = await prisma.case.findFirst({ where: { reportId: evidence.reportId, assignedInvestigatorId: req.user!.id } });
      if (!assignedCase) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    if (req.user!.role === 'USER' && evidence.report.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const filePath = getUploadPath(evidence.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    await logAudit(req.user!.id, 'download evidence', evidence.id, String(req.ip));
    const metadata = evidence.metadata as { originalName?: string } | null;
    const originalName = metadata?.originalName ?? evidence.fileUrl;
    res.download(filePath, originalName);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to download evidence' });
  }
});

router.delete('/:id', verifyToken, isAdmin, [param('id').isInt().withMessage('Evidence ID is required')], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const evidenceId = Number(req.params.id);
    const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId } });
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }
    const filePath = getUploadPath(evidence.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await prisma.evidence.delete({ where: { id: evidenceId } });
    await logAudit(req.user!.id, 'delete evidence', evidenceId, String(req.ip));
    res.json({ message: 'Evidence deleted' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to delete evidence' });
  }
});

router.post('/export', verifyToken, isAdmin, [body('evidenceIds').isArray({ min: 1 }).withMessage('Evidence IDs are required'), body('evidenceIds.*').isInt().withMessage('Evidence IDs must be integers')], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const evidenceIds: number[] = req.body.evidenceIds;
    const evidences = await prisma.evidence.findMany({ where: { id: { in: evidenceIds } }, include: { report: true, uploadedBy: { select: { id: true, email: true, fullName: true } } } });
    if (evidences.length === 0) {
      return res.status(404).json({ error: 'No evidence items found' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=evidence-export.zip');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    const metadata = evidences.map((item: { id: any; reportId: any; report: { title: any; }; fileUrl: any; fileHash: any; fileType: any; metadata: any; uploadedBy: any; uploadedAt: any; }) => ({
      id: item.id,
      reportId: item.reportId,
      reportTitle: item.report.title,
      fileUrl: item.fileUrl,
      fileHash: item.fileHash,
      fileType: item.fileType,
      metadata: item.metadata,
      uploadedBy: item.uploadedBy,
      uploadedAt: item.uploadedAt,
    }));
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

    for (const item of evidences) {
      const filePath = getUploadPath(item.fileUrl);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: path.basename(item.fileUrl) });
      }
    }

    await archive.finalize();
    await logAudit(req.user!.id, 'export evidence bulk', null, String(req.ip));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to export evidence' });
  }
});

router.get('/:id/verify', verifyToken, [param('id').isInt().withMessage('Evidence ID is required')], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const evidenceId = Number(req.params.id);
    const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId }, include: { report: true } });
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }
    if (req.user!.role === 'INVESTIGATOR' || req.user!.role === 'VOLUNTEER') {
      const assignedCase = await prisma.case.findFirst({ where: { reportId: evidence.reportId, assignedInvestigatorId: req.user!.id } });
      if (!assignedCase) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    if (req.user!.role === 'USER' && evidence.report.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const filePath = getUploadPath(evidence.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    const buffer = await fs.promises.readFile(filePath);
    const currentHash = computeHash(buffer);
    await logAudit(req.user!.id, 'verify evidence', evidence.id, String(req.ip));
    res.json({ storedHash: evidence.fileHash, currentHash, matches: currentHash === evidence.fileHash });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to verify evidence' });
  }
});

export default router;
