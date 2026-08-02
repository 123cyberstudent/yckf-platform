import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { verifyToken, AuthRequest } from '../auth/middleware.js';
import { prisma } from '../shared/db.js';
import { validateRequest } from '../utils/validators.js';

const router = Router();

/**
 * GET /api/enrolments/my — the current user's course enrolments with course details.
 * Users only ever see their own enrolments.
 */
router.get('/my', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const enrolments = await prisma.courseEnrolment.findMany({
      where: { userId: req.user!.id },
      include: { course: true },
      orderBy: { grantedAt: 'desc' },
    });
    res.json({ enrolments });
  } catch (err) {
    console.error('Failed to list user enrolments', err);
    res.status(500).json({ error: 'Failed to list enrolments' });
  }
});

/**
 * POST /api/enrolments/subscribe — a user subscribes to a course, which
 * auto-enrols them and grants full access to study until completion.
 * Accepts { slug } or { courseId }. Idempotent.
 */
router.post(
  '/subscribe',
  verifyToken,
  [
    body('slug').optional().trim().notEmpty().withMessage('Course slug is required'),
    body('courseId').optional().isInt().withMessage('Course id must be an integer'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { slug, courseId } = req.body;

      const course = slug
        ? await prisma.course.findUnique({ where: { slug } })
        : courseId
          ? await prisma.course.findUnique({ where: { id: Number(courseId) } })
          : null;

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      if (!course.active) {
        return res.status(400).json({ error: 'Course is not currently available' });
      }

      const existing = await prisma.courseEnrolment.findUnique({
        where: { userId_courseId: { userId: req.user!.id, courseId: course.id } },
        include: { course: true },
      });
      if (existing) {
        return res.json({ success: true, enrolment: existing, alreadyEnrolled: true });
      }

      const enrolment = await prisma.courseEnrolment.create({
        data: {
          userId: req.user!.id,
          courseId: course.id,
          source: 'SUBSCRIBE',
          status: 'active',
          grantedAt: new Date(),
        },
        include: { course: true },
      });

      res.status(201).json({ success: true, enrolment, alreadyEnrolled: false });
    } catch (err) {
      console.error('Failed to subscribe to course', err);
      res.status(500).json({ error: 'Failed to subscribe to course' });
    }
  }
);

/**
 * PATCH /api/enrolments/:id/progress — the enrolled user updates their own
 * study progress (0-100). Reaching 100 marks the course completed.
 */
router.patch(
  '/:id/progress',
  verifyToken,
  [
    param('id').isInt().withMessage('Enrolment id must be an integer'),
    body('progressPercent').isFloat({ min: 0, max: 100 }).withMessage('progressPercent must be between 0 and 100'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const enrolmentId = Number(req.params.id);
      const enrolment = await prisma.courseEnrolment.findUnique({ where: { id: enrolmentId } });
      if (!enrolment || enrolment.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Enrolment not found' });
      }

      const progressPercent = Math.round(Number(req.body.progressPercent));
      const completed = progressPercent >= 100;

      const updated = await prisma.courseEnrolment.update({
        where: { id: enrolmentId },
        data: {
          progressPercent,
          status: completed ? 'completed' : 'active',
          completedAt: completed ? new Date() : null,
        },
        include: { course: true },
      });

      res.json({ success: true, enrolment: updated });
    } catch (err) {
      console.error('Failed to update enrolment progress', err);
      res.status(500).json({ error: 'Failed to update enrolment progress' });
    }
  }
);

export default router;
