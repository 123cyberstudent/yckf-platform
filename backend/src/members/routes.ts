import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { verifyToken, isAdmin } from '../auth/middleware.js';
import { prisma } from '../shared/db.js';
import { validateRequest } from '../utils/validators.js';
import { logAudit } from '../audit/service.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const members = await prisma.member.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load members' });
  }
});

router.get('/all', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const members = await prisma.member.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load members' });
  }
});

router.post(
  '/',
  verifyToken,
  isAdmin,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role').trim().notEmpty().withMessage('Role is required'),
    body('bio').optional().trim(),
    body('email').optional().isEmail(),
    body('linkedin').optional().trim(),
    body('twitter').optional().trim(),
    body('imageUrl').optional().trim(),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { name, role, bio, email, linkedin, twitter, imageUrl, sortOrder } = req.body;
      const member = await prisma.member.create({
        data: { name, role, bio, email, linkedin, twitter, imageUrl, sortOrder: sortOrder ?? 0 },
      });
      await logAudit((req as any).user?.id ?? null, 'create member', member.id, String(req.ip || 'unknown'));
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create member' });
    }
  }
);

router.put(
  '/:id',
  verifyToken,
  isAdmin,
  [
    body('name').optional().trim().notEmpty(),
    body('role').optional().trim().notEmpty(),
    body('bio').optional().trim(),
    body('email').optional().isEmail(),
    body('linkedin').optional().trim(),
    body('twitter').optional().trim(),
    body('imageUrl').optional().trim(),
    body('sortOrder').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const data = req.body;
      const member = await prisma.member.update({ where: { id }, data });
      await logAudit((req as any).user?.id ?? null, 'update member', member.id, String(req.ip || 'unknown'));
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update member' });
    }
  }
);

router.delete('/:id', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.member.update({ where: { id }, data: { isActive: false } });
    await logAudit((req as any).user?.id ?? null, 'delete member', id, String(req.ip || 'unknown'));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

export default router;
