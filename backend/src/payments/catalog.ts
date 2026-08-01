import { Router } from 'express';
import { generalRateLimiter } from '../shared/rateLimiter.js';
import { getCourseBySlug, listActiveCourses, listActivePackages } from './courseCatalog.js';

const router = Router();

router.use(generalRateLimiter);

/** GET /api/catalog/courses — public catalogue of active courses */
router.get('/courses', async (_req, res) => {
  try {
    const courses = await listActiveCourses();
    res.json({
      success: true,
      courses: courses.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        level: c.level,
        duration: c.duration,
        category: c.category,
        imageUrl: c.imageUrl,
        price: c.price,
        creditsPrice: c.creditsPrice,
      })),
    });
  } catch (err) {
    console.error('Failed to list courses:', err);
    res.status(500).json({ success: false, error: 'Failed to list courses' });
  }
});

/** GET /api/catalog/courses/:slug — single course */
router.get('/courses/:slug', async (req, res) => {
  try {
    const course = await getCourseBySlug(req.params.slug);
    if (!course || !course.active) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    res.json({ success: true, course });
  } catch (err) {
    console.error('Failed to get course:', err);
    res.status(500).json({ success: false, error: 'Failed to get course' });
  }
});

/** GET /api/catalog/packages — active credit packages */
router.get('/packages', async (_req, res) => {
  try {
    const packages = await listActivePackages();
    res.json({
      success: true,
      packages: packages.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        baseCredits: p.baseCredits,
        bonusCredits: p.bonusCredits,
        totalCredits: p.totalCredits,
        price: p.price,
        featured: p.featured,
        promotionLabel: p.promotionLabel,
      })),
    });
  } catch (err) {
    console.error('Failed to list packages:', err);
    res.status(500).json({ success: false, error: 'Failed to list packages' });
  }
});

export default router;
