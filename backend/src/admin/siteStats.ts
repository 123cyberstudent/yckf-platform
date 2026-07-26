import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { verifyToken, isAdmin, AuthRequest } from '../auth/middleware.js';
import { prisma } from '../shared/db.js';
import { validateRequest } from '../utils/validators.js';

const router = Router();
const adminRouter = Router();

router.get('/public', async (req, res) => {
  try {
    const { section } = req.query;
    const where: any = { isActive: true };
    if (section) where.section = String(section);
    const stats = await prisma.siteStat.findMany({ where, orderBy: { order: 'asc' } });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load site stats' });
  }
});

adminRouter.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { section } = req.query;
    const where: any = {};
    if (section) where.section = String(section);
    const stats = await prisma.siteStat.findMany({ where, orderBy: { order: 'asc' } });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load site stats' });
  }
});

adminRouter.post(
  '/',
  verifyToken,
  isAdmin,
  [
    body('stat').trim().notEmpty().withMessage('Stat value is required'),
    body('label').trim().notEmpty().withMessage('Label is required'),
    body('section').optional().isIn(['hero', 'impact']).withMessage('Section must be hero or impact'),
    body('icon').optional().isString(),
    body('order').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { stat, label, section = 'hero', icon, order = 0 } = req.body;
      const item = await prisma.siteStat.create({ data: { stat, label, section, icon, order } });
      res.status(201).json(item);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create site stat' });
    }
  }
);

adminRouter.put(
  '/:id',
  verifyToken,
  isAdmin,
  [
    param('id').isInt().withMessage('ID must be an integer'),
    body('stat').optional().trim().notEmpty(),
    body('label').optional().trim().notEmpty(),
    body('section').optional().isIn(['hero', 'impact']),
    body('icon').optional().isString(),
    body('order').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const data: any = {};
      if (req.body.stat !== undefined) data.stat = req.body.stat;
      if (req.body.label !== undefined) data.label = req.body.label;
      if (req.body.section !== undefined) data.section = req.body.section;
      if (req.body.icon !== undefined) data.icon = req.body.icon;
      if (req.body.order !== undefined) data.order = req.body.order;
      if (req.body.isActive !== undefined) data.isActive = req.body.isActive;
      const item = await prisma.siteStat.update({ where: { id }, data });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update site stat' });
    }
  }
);

adminRouter.delete(
  '/:id',
  verifyToken,
  isAdmin,
  [param('id').isInt().withMessage('ID must be an integer')],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      await prisma.siteStat.delete({ where: { id } });
      res.json({ message: 'Site stat deleted' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete site stat' });
    }
  }
);

export { router as siteStatsPublicRouter, adminRouter as siteStatsAdminRouter };
