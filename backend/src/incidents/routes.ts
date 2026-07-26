import { Request, Response, Router } from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken, isAdmin, isInvestigator, AuthRequest } from '../auth/middleware.js';
import { prisma } from '../shared/db.js';
import { createNotification } from '../notifications/service.js';
import { decryptField, encryptField } from '../shared/encryption.js';
import { validateRequest } from '../utils/validators.js';

const router = Router();
const CASE_STATUSES = ['open', 'investigating', 'pending_evidence', 'resolved', 'closed'];

router.post(
  '/',
  verifyToken,
  isAdmin,
  [body('reportId').isInt().withMessage('reportId is required')],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { reportId } = req.body;
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }
      const newCase = await prisma.case.create({
        data: {
          reportId,
          status: 'open',
        },
      });
      res.status(201).json(newCase);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to create case' });
    }
  }
);

router.get(
  '/',
  verifyToken,
  isInvestigator,
  [
    query('status').optional().isIn(CASE_STATUSES).withMessage('Invalid status filter'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.query;
      const where: any = req.user!.role === 'VOLUNTEER' ? {} : { assignedInvestigatorId: req.user!.id };
      if (status) where.status = status;
      const cases = await prisma.case.findMany({
        where,
        include: {
          report: { select: { id: true, title: true, userId: true } },
          assignedInvestigator: { select: { id: true, email: true, fullName: true } },
        },
      });
      res.json({ cases });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load cases' });
    }
  }
);

router.get('/:id', verifyToken, isInvestigator, [param('id').isInt().withMessage('Case ID must be an integer')], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const caseId = Number(req.params.id);
    const caseItem = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        report: true,
        assignedInvestigator: { select: { id: true, email: true, fullName: true } },
        notes: { include: { author: { select: { id: true, email: true, fullName: true } } } },
        history: { include: { changedBy: { select: { id: true, email: true, fullName: true } } } },
      },
    });
    if (!caseItem) {
      return res.status(404).json({ error: 'Case not found' });
    }
    if (req.user!.role !== 'ADMIN' && caseItem.assignedInvestigatorId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const decryptedNotes = caseItem.notes.map((note: { note: string; }) => ({
      ...note,
      note: decryptField(note.note),
    }));
    res.json({ ...caseItem, notes: decryptedNotes });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to fetch case' });
  }
});

router.put(
  '/:id/assign',
  verifyToken,
  isAdmin,
  [
    param('id').isInt().withMessage('Case ID must be an integer'),
    body('assignedInvestigatorId').isInt().withMessage('Investigator ID is required'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const caseId = Number(req.params.id);
      const assignedInvestigatorId = req.body.assignedInvestigatorId;
      const investigator = await prisma.user.findUnique({ where: { id: assignedInvestigatorId } });
      if (!investigator || (investigator.role !== 'INVESTIGATOR' && investigator.role !== 'VOLUNTEER')) {
        return res.status(400).json({ error: 'Assigned user must be an investigator' });
      }
      const updatedCase = await prisma.case.update({
        where: { id: caseId },
        data: { assignedInvestigatorId },
      });
      await createNotification({
        recipientId: investigator.id,
        senderId: req.user!.id,
        type: 'case_assignment',
        title: 'Case Assigned',
        body: `You were assigned to case #${caseId}.`,
        link: `/cases/${caseId}`,
        caseId,
      });
      res.json(updatedCase);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to assign case' });
    }
  }
);

router.put(
  '/:id/status',
  verifyToken,
  isInvestigator,
  [
    param('id').isInt().withMessage('Case ID must be an integer'),
    body('status').isIn(CASE_STATUSES).withMessage('Invalid status'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const caseId = Number(req.params.id);
      const targetCase = await prisma.case.findUnique({ where: { id: caseId }, include: { report: { select: { userId: true } } } });
      if (!targetCase) {
        return res.status(404).json({ error: 'Case not found' });
      }
      if (req.user!.role !== 'ADMIN' && targetCase.assignedInvestigatorId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const updated = await prisma.case.update({
        where: { id: caseId },
        data: { status: req.body.status },
      });
      await prisma.caseHistory.create({
        data: {
          caseId,
          oldStatus: targetCase.status,
          newStatus: req.body.status,
          changedById: req.user!.id,
        },
      });
      const caseOwner = await prisma.user.findUnique({ where: { id: targetCase.report.userId } });
      if (caseOwner) {
        await createNotification({
          recipientId: caseOwner.id,
          senderId: req.user!.id,
          type: 'case_status',
          title: 'Case Status Updated',
          body: `The status of case #${caseId} changed to ${req.body.status}.`,
          link: `/cases/${caseId}`,
          caseId,
        });
      }
      if (updated.assignedInvestigatorId) {
        await createNotification({
          recipientId: updated.assignedInvestigatorId,
          senderId: req.user!.id,
          type: 'case_status',
          title: 'Case Status Updated',
          body: `The status of your assigned case #${caseId} changed to ${req.body.status}.`,
          link: `/cases/${caseId}`,
          caseId,
        });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to update case status' });
    }
  }
);

router.post(
  '/:id/notes',
  verifyToken,
  isInvestigator,
  [param('id').isInt().withMessage('Case ID must be an integer'), body('note').trim().notEmpty().withMessage('Note is required')],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const caseId = Number(req.params.id);
      const targetCase = await prisma.case.findUnique({ where: { id: caseId } });
      if (!targetCase) {
        return res.status(404).json({ error: 'Case not found' });
      }
      if (req.user!.role !== 'ADMIN' && targetCase.assignedInvestigatorId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const note = await prisma.investigationNote.create({
        data: {
          caseId,
          authorId: req.user!.id,
          note: encryptField(req.body.note),
        },
      });
      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to add note' });
    }
  }
);

export default router;
