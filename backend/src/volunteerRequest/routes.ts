import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, professionalField, skills, yearsOfExperience, motivation, referralSource } = req.body;

    if (!fullName?.trim() || !email?.trim() || !motivation?.trim()) {
      return res.status(400).json({ error: 'Full name, email, and motivation are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const request = await prisma.volunteerRequest.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        professionalField: professionalField?.trim() || null,
        skills: skills?.trim() || null,
        yearsOfExperience: yearsOfExperience?.trim() || null,
        motivation: motivation.trim(),
        referralSource: referralSource?.trim() || null,
      },
    });

    res.status(201).json({ success: true, id: request.id });
  } catch (error) {
    console.error('Volunteer request error:', error);
    res.status(500).json({ error: 'Failed to submit volunteer request.' });
  }
});

export default router;
