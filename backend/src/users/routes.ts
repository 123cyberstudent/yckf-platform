import bcrypt from 'bcryptjs';
import { Response, Router } from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken, isAdmin, AuthRequest } from '../auth/middleware.js';
import { prisma } from '../shared/db.js';
import { validateRequest } from '../utils/validators.js';
import { logAudit } from '../audit/service.js';

const router = Router();
const ROLES = ['ADMIN', 'INVESTIGATOR', 'USER'];
const STATUS_OPTIONS = ['active', 'inactive'];

router.get(
  '/',
  verifyToken,
  isAdmin,
  [
    query('role').optional().isIn(ROLES).withMessage('Invalid role filter'),
    query('status').optional().isIn(STATUS_OPTIONS).withMessage('Invalid status filter'),
    query('search').optional().trim().isString().withMessage('Search must be a string'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    const { role, status, search } = req.query;
    const where: any = {};
    if (role) where.role = role;
    if (status) where.isActive = status === 'active';
    if (search) {
      where.OR = [
        { email: { contains: String(search), mode: 'insensitive' } },
        { fullName: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  }
);

router.post(
  '/',
  verifyToken,
  isAdmin,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[0-9])(?=.*[^A-Za-z0-9]).*$/)
      .withMessage('Password must contain at least one number and one special character'),
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('role').optional().isIn(ROLES).withMessage('Invalid role'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    const { email, password, fullName, role = 'USER' } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role,
      },
    });

    await logAudit(req.user!.id, 'create user', user.id, String(req.ip));
    res.status(201).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  }
);

router.put(
  '/:id',
  verifyToken,
  isAdmin,
  [
    param('id').isInt().withMessage('User ID must be an integer'),
    body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
    body('role').optional().isIn(ROLES).withMessage('Invalid role'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    const userId = Number(req.params.id);
    const updates: any = {};
    if (req.body.fullName) updates.fullName = req.body.fullName;
    if (req.body.role) updates.role = req.body.role;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    await logAudit(req.user!.id, 'update user', user.id, String(req.ip));
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    });
  }
);

router.delete(
  '/:id',
  verifyToken,
  isAdmin,
  [param('id').isInt().withMessage('User ID must be an integer')],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    const userId = Number(req.params.id);
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    await logAudit(req.user!.id, 'soft delete user', userId, String(req.ip));
    res.json({ message: 'User suspended successfully' });
  }
);

router.put(
  '/:id/suspend',
  verifyToken,
  isAdmin,
  [
    param('id').isInt().withMessage('User ID must be an integer'),
    body('active').optional().isBoolean().withMessage('Active flag must be boolean'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    const userId = Number(req.params.id);
    const isActive = req.body.active === undefined ? false : req.body.active;
    const user = await prisma.user.update({ where: { id: userId }, data: { isActive } });
    const action = isActive ? 'activate user' : 'suspend user';
    await logAudit(req.user!.id, action, user.id, String(req.ip));
    res.json({ message: `User ${isActive ? 'activated' : 'suspended'}`, user });
  }
);

export default router;
