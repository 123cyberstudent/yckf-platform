import { Router } from 'express';
import { AuthRequest, verifyToken } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';
import { PaymentError } from './errors.js';
import { getOrCreateReferralCode, listActivePromotions, normalizeCode, registerReferral, resolveDiscountForQuote } from './promotionService.js';

const router = Router();

router.use(verifyToken, generalRateLimiter);

/** GET /api/promotions — active promotions for banners/modals */
router.get('/', async (_req: AuthRequest, res) => {
  try {
    const promotions = await listActivePromotions();
    res.json({
      success: true,
      promotions: promotions.map((p) => ({
        id: p.id,
        publicTitle: p.publicTitle,
        publicDescription: p.publicDescription,
        promotionType: p.promotionType,
        bannerEnabled: p.bannerEnabled,
        modalEnabled: p.modalEnabled,
        codeRequired: p.codeRequired,
        bonusCredits: p.bonusCredits,
      })),
    });
  } catch (err) {
    console.error('Failed to list promotions:', err);
    res.status(500).json({ success: false, error: 'Failed to list promotions' });
  }
});

/** POST /api/promotions/validate — { code } → discount breakdown for a prospective order */
router.post('/validate', async (req: AuthRequest, res) => {
  try {
    const { code, orderType, subtotal, productIds } = req.body ?? {};
    if (!code) {
      return res.status(400).json({ success: false, error: 'code is required' });
    }
    const discount = await resolveDiscountForQuote(String(code), {
      userId: req.user!.id,
      orderType: String(orderType ?? 'COURSE'),
      subtotal: Number(subtotal) || 0,
      productIds: Array.isArray(productIds) ? productIds.map(Number) : [],
      isFirstPurchase: false,
    });
    res.json({ success: true, valid: true, discount });
  } catch (err) {
    if (err instanceof PaymentError) {
      return res.json({ success: true, valid: false, code: err.code, error: err.message });
    }
    console.error('Failed to validate promo code:', err);
    res.status(500).json({ success: false, error: 'Failed to validate promo code' });
  }
});

/** GET /api/promotions/me/referral-code — the user's own referral code */
router.get('/me/referral-code', async (req: AuthRequest, res) => {
  try {
    const code = await getOrCreateReferralCode(req.user!.id);
    res.json({ success: true, code: code.code });
  } catch (err) {
    if (err instanceof PaymentError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    console.error('Failed to get referral code:', err);
    res.status(500).json({ success: false, error: 'Failed to get referral code' });
  }
});

/** POST /api/promotions/referral/link — record that this user was referred */
router.post('/referral/link', async (req: AuthRequest, res) => {
  try {
    const code = req.body?.code;
    if (typeof code !== 'string' || !normalizeCode(code)) {
      return res.status(400).json({ success: false, error: 'code is required' });
    }
    await registerReferral(code, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to link referral:', err);
    res.status(500).json({ success: false, error: 'Failed to link referral' });
  }
});

export default router;
