import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { verifyToken, isAdmin } from '../auth/middleware.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { specialty, search } = req.query;
    const where: any = { isActive: true };
    if (specialty) where.specialty = String(specialty);
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { specialty: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const specialists = await prisma.specialist.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(specialists);
  } catch (err) {
    console.error('Failed to list specialists:', err);
    res.status(500).json({ error: 'Failed to list specialists' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const specialist = await prisma.specialist.findUnique({ where: { id: Number(req.params.id) } });
    if (!specialist) return res.status(404).json({ error: 'Specialist not found' });
    res.json(specialist);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get specialist' });
  }
});

router.post('/', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, phone, specialty, bio, avatarUrl } = req.body;
    if (!name || !email || !specialty) {
      return res.status(400).json({ error: 'name, email, and specialty are required' });
    }
    const existing = await prisma.specialist.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'A specialist with this email already exists' });
    }
    const specialist = await prisma.specialist.create({
      data: { name, email, phone: phone || null, specialty, bio: bio || null, avatarUrl: avatarUrl || null },
    });
    res.status(201).json(specialist);
  } catch (err) {
    console.error('Failed to create specialist:', err);
    res.status(500).json({ error: 'Failed to create specialist' });
  }
});

router.put('/:id', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, phone, specialty, bio, avatarUrl, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone || null;
    if (specialty !== undefined) data.specialty = specialty;
    if (bio !== undefined) data.bio = bio || null;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null;
    if (isActive !== undefined) data.isActive = isActive;
    const specialist = await prisma.specialist.update({ where: { id: Number(req.params.id) }, data });
    res.json(specialist);
  } catch (err) {
    console.error('Failed to update specialist:', err);
    res.status(500).json({ error: 'Failed to update specialist' });
  }
});

router.delete('/:id', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.specialist.update({ where: { id: Number(req.params.id) }, data: { isActive: false } });
    res.json({ message: 'Specialist deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete specialist' });
  }
});

export default router;
