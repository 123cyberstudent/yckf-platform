import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';
import { getEligiblePromo, recordPromoEngagement } from './promotions.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-do-not-use-in-production';

/** Best-effort auth: populates req.user when a valid access token is present. */
async function optionalAuth(req: AuthRequest, _res: unknown, next: () => void) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET) as unknown as {
        sub?: number;
        type?: string;
      };
      if (payload.type === 'access' && typeof payload.sub === 'number') {
        req.user = { id: payload.sub, role: '', email: undefined };
      }
    } catch {
      /* invalid token — treated as unauthenticated */
    }
  }
  next();
}

/** GET /api/promotions/eligible?placement=&platform= — server decides eligibility. */
router.get('/eligible', generalRateLimiter, optionalAuth, async (req: AuthRequest, res) => {
  try {
    const placement = String(req.query.placement || '');
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const result = await getEligiblePromo({
      placement,
      platform,
      userId: req.user?.id,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Failed to resolve eligible promotion:', err);
    res.status(500).json({ success: false, error: 'Failed to resolve eligible promotion' });
  }
});

/** POST /api/promotions/eligible/engagement — { promoKey, placement, action }. */
router.post('/eligible/engagement', generalRateLimiter, optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { promoKey, placement, action, platform } = req.body ?? {};
    if (!req.user) {
      return res.json({ success: true, tracked: false });
    }
    if (
      typeof promoKey !== 'string' ||
      typeof placement !== 'string' ||
      !['impression', 'dismiss', 'click'].includes(String(action))
    ) {
      return res.status(400).json({ success: false, error: 'promoKey, placement and action (impression|dismiss|click) are required' });
    }
    await recordPromoEngagement({
      userId: req.user.id,
      promoKey,
      placement,
      action,
      platform: typeof platform === 'string' ? platform : undefined,
    });
    res.json({ success: true, tracked: true });
  } catch (err) {
    console.error('Failed to record promotion engagement:', err);
    res.status(500).json({ success: false, error: 'Failed to record promotion engagement' });
  }
});

export default router;
