import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { toMinorUnits } from '../payments/money.js';

const router = Router();

const PROMOTION_TYPES = [
  'BONUS_CREDITS',
  'PERCENTAGE_DISCOUNT',
  'FIXED_DISCOUNT',
  'FREE_COURSE',
  'COURSE_BUNDLE',
  'SIGNUP_REWARD',
  'REFERRAL_REWARD',
];
const PROMOTION_STATUSES = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'];
const PRODUCT_TYPES = ['COURSE', 'CREDIT_PACKAGE'];
const USER_SEGMENTS = ['NEW', 'EXISTING'];

function normalizeCodes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((c) => String(c).trim().toUpperCase()).filter(Boolean))];
}

function serializePromotion(p: any) {
  return {
    id: p.id,
    internalName: p.internalName,
    publicTitle: p.publicTitle,
    publicDescription: p.publicDescription,
    promotionType: p.promotionType,
    status: p.status,
    codeRequired: p.codeRequired,
    bonusCredits: p.bonusCredits,
    discountType: p.discountType,
    discountValue: p.discountValue,
    minimumPurchaseAmount: p.minimumPurchaseAmount,
    minimumPurchaseAmountGhs: p.minimumPurchaseAmount / 100,
    minimumCreditPackageId: p.minimumCreditPackageId,
    eligibleProductType: p.eligibleProductType,
    eligibleCourseIds: p.eligibleCourseIds,
    eligiblePackageIds: p.eligiblePackageIds,
    eligibleUserSegment: p.eligibleUserSegment,
    firstPurchaseOnly: p.firstPurchaseOnly,
    perUserRedemptionLimit: p.perUserRedemptionLimit,
    totalRedemptionLimit: p.totalRedemptionLimit,
    redemptionCount: p.redemptionCount,
    stackable: p.stackable,
    priority: p.priority,
    bannerEnabled: p.bannerEnabled,
    modalEnabled: p.modalEnabled,
    startAt: p.startAt,
    endAt: p.endAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    promoCodeCount: p._count?.promoCodes ?? 0,
  };
}

function validatePromotionBody(body: any) {
  const errors: string[] = [];

  const internalName = typeof body.internalName === 'string' ? body.internalName.trim() : '';
  if (!internalName) errors.push('internalName is required');

  const promotionType = String(body.promotionType ?? '');
  if (!PROMOTION_TYPES.includes(promotionType)) errors.push(`promotionType must be one of ${PROMOTION_TYPES.join(', ')}`);

  const status = String(body.status ?? 'DRAFT');
  if (!PROMOTION_STATUSES.includes(status)) errors.push(`status must be one of ${PROMOTION_STATUSES.join(', ')}`);

  if (body.codeRequired !== undefined && typeof body.codeRequired !== 'boolean') errors.push('codeRequired must be a boolean');

  const discountType = body.discountType ? String(body.discountType) : null;
  if (discountType && !['PERCENT', 'FIXED'].includes(discountType)) errors.push('discountType must be PERCENT or FIXED');

  const discountValue = Number(body.discountValue ?? 0);
  if (!Number.isFinite(discountValue) || discountValue < 0) errors.push('discountValue must be a non-negative number');

  const bonusCredits = Number(body.bonusCredits ?? 0);
  if (!Number.isFinite(bonusCredits) || bonusCredits < 0 || !Number.isInteger(bonusCredits)) {
    errors.push('bonusCredits must be a non-negative integer');
  }

  const minimumPurchaseAmountGhs = body.minimumPurchaseAmountGhs === undefined || body.minimumPurchaseAmountGhs === null || body.minimumPurchaseAmountGhs === ''
    ? 0
    : Number(body.minimumPurchaseAmountGhs);
  if (!Number.isFinite(minimumPurchaseAmountGhs) || minimumPurchaseAmountGhs < 0) {
    errors.push('minimumPurchaseAmountGhs must be a non-negative amount');
  }

  if (body.eligibleProductType && !PRODUCT_TYPES.includes(String(body.eligibleProductType))) {
    errors.push('eligibleProductType must be COURSE or CREDIT_PACKAGE');
  }
  if (body.eligibleUserSegment && !USER_SEGMENTS.includes(String(body.eligibleUserSegment))) {
    errors.push('eligibleUserSegment must be NEW or EXISTING');
  }

  const perUserRedemptionLimit = Number(body.perUserRedemptionLimit ?? 1);
  if (!Number.isFinite(perUserRedemptionLimit) || perUserRedemptionLimit < 1 || !Number.isInteger(perUserRedemptionLimit)) {
    errors.push('perUserRedemptionLimit must be a positive integer');
  }

  if (body.totalRedemptionLimit !== undefined && body.totalRedemptionLimit !== null && body.totalRedemptionLimit !== '') {
    const t = Number(body.totalRedemptionLimit);
    if (!Number.isFinite(t) || t < 1 || !Number.isInteger(t)) errors.push('totalRedemptionLimit must be a positive integer');
  }

  if (body.startAt && isNaN(Date.parse(body.startAt))) errors.push('startAt must be a valid date');
  if (body.endAt && isNaN(Date.parse(body.endAt))) errors.push('endAt must be a valid date');

  return {
    errors,
    internalName,
    promotionType,
    status,
    discountType,
    discountValue: Math.round(discountValue),
    bonusCredits,
    minimumPurchaseAmountMinor: toMinorUnits(minimumPurchaseAmountGhs),
    perUserRedemptionLimit,
  };
}

function promoDataFromValidated(body: any, v: ReturnType<typeof validatePromotionBody>) {
  const data: any = {
    internalName: v.internalName,
    promotionType: v.promotionType,
    status: v.status,
    codeRequired: body.codeRequired === true,
    bonusCredits: v.bonusCredits,
    discountType: v.discountType,
    discountValue: v.discountValue,
    minimumPurchaseAmount: v.minimumPurchaseAmountMinor,
    minimumCreditPackageId: body.minimumCreditPackageId ? Number(body.minimumCreditPackageId) : null,
    eligibleProductType: body.eligibleProductType ? String(body.eligibleProductType) : null,
    eligibleCourseIds: Array.isArray(body.eligibleCourseIds) ? body.eligibleCourseIds.map(Number) : [],
    eligiblePackageIds: Array.isArray(body.eligiblePackageIds) ? body.eligiblePackageIds.map(Number) : [],
    eligibleUserSegment: body.eligibleUserSegment ? String(body.eligibleUserSegment) : null,
    firstPurchaseOnly: body.firstPurchaseOnly === true,
    perUserRedemptionLimit: v.perUserRedemptionLimit,
    totalRedemptionLimit:
      body.totalRedemptionLimit === undefined || body.totalRedemptionLimit === null || body.totalRedemptionLimit === ''
        ? null
        : Number(body.totalRedemptionLimit),
    stackable: body.stackable === true,
    priority: body.priority === undefined || body.priority === '' ? 0 : Number(body.priority),
    bannerEnabled: body.bannerEnabled === true,
    modalEnabled: body.modalEnabled === true,
    startAt: body.startAt ? new Date(body.startAt) : null,
    endAt: body.endAt ? new Date(body.endAt) : null,
  };
  if (body.publicTitle !== undefined) data.publicTitle = body.publicTitle ? String(body.publicTitle) : null;
  if (body.publicDescription !== undefined) data.publicDescription = body.publicDescription ? String(body.publicDescription) : null;
  return data;
}

/** GET /api/admin/promotions — filters: status, promotionType, search */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, promotionType, search } = req.query;
    const where: any = {};
    if (status && PROMOTION_STATUSES.includes(String(status))) where.status = String(status);
    if (promotionType && PROMOTION_TYPES.includes(String(promotionType))) where.promotionType = String(promotionType);
    if (search) {
      where.OR = [
        { internalName: { contains: String(search), mode: 'insensitive' } },
        { publicTitle: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const promotions = await prisma.promotion.findMany({
      where,
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { id: 'desc' }],
      include: { _count: { select: { promoCodes: true, redemptions: true } } },
    });

    res.json({ promotions: promotions.map(serializePromotion), total: promotions.length });
  } catch (err) {
    console.error('Failed to list promotions:', err);
    res.status(500).json({ error: 'Failed to list promotions' });
  }
});

/** POST /api/admin/promotions — create. Body includes optional `codes: string[]` to seed promo codes. */
router.post('/', async (req: Request, res: Response) => {
  try {
    const v = validatePromotionBody(req.body);
    if (v.errors.length) return res.status(400).json({ error: v.errors.join('; ') });

    const data = promoDataFromValidated(req.body, v);
    const codes = normalizeCodes(req.body.codes);

    if (v.promotionType === 'PROMO_CODE_ONLY') {
      // Not a real promotion type in this schema; reject defensively.
      return res.status(400).json({ error: 'Unsupported promotion type' });
    }

    const promotion = await prisma.promotion.create({
      data: {
        ...data,
        createdByUserId: (req as any).user?.id ?? null,
        ...(codes.length
          ? {
              promoCodes: {
                create: codes.map((code) => ({
                  code,
                  normalizedCode: code.toLowerCase(),
                  type: 'PROMO',
                  status: 'ACTIVE',
                })),
              },
            }
          : {}),
      },
      include: { _count: { select: { promoCodes: true, redemptions: true } } },
    });

    res.status(201).json({ promotion: serializePromotion(promotion) });
  } catch (err) {
    console.error('Failed to create promotion:', err);
    if ((err as any)?.code === 'P2002') {
      return res.status(409).json({ error: 'A promo code in this request already exists' });
    }
    res.status(500).json({ error: 'Failed to create promotion' });
  }
});

/** PATCH /api/admin/promotions/:id — update promotion fields */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid promotion id' });

    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Promotion not found' });

    const v = validatePromotionBody({ ...existing, ...req.body });
    if (v.errors.length) return res.status(400).json({ error: v.errors.join('; ') });

    const data = promoDataFromValidated({ ...existing, ...req.body }, v);
    const promotion = await prisma.promotion.update({
      where: { id },
      data,
      include: { _count: { select: { promoCodes: true, redemptions: true } } },
    });

    res.json({ promotion: serializePromotion(promotion) });
  } catch (err) {
    console.error('Failed to update promotion:', err);
    res.status(500).json({ error: 'Failed to update promotion' });
  }
});

/** POST /api/admin/promotions/:id/activate — set status ACTIVE */
router.post('/:id/activate', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Promotion not found' });

    const promotion = await prisma.promotion.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: { _count: { select: { promoCodes: true, redemptions: true } } },
    });
    res.json({ promotion: serializePromotion(promotion) });
  } catch (err) {
    console.error('Failed to activate promotion:', err);
    res.status(500).json({ error: 'Failed to activate promotion' });
  }
});

/** POST /api/admin/promotions/:id/pause — set status PAUSED */
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Promotion not found' });

    const promotion = await prisma.promotion.update({
      where: { id },
      data: { status: 'PAUSED' },
      include: { _count: { select: { promoCodes: true, redemptions: true } } },
    });
    res.json({ promotion: serializePromotion(promotion) });
  } catch (err) {
    console.error('Failed to pause promotion:', err);
    res.status(500).json({ error: 'Failed to pause promotion' });
  }
});

/** GET /api/admin/promotions/:id/codes — list promo codes for a promotion */
router.get('/:id/codes', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Promotion not found' });

    const codes = await prisma.promoCode.findMany({
      where: { promotionId: id },
      orderBy: { id: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
    res.json({ codes: codes.map((c) => ({ ...c, useCount: c._count.orders })) });
  } catch (err) {
    console.error('Failed to list promo codes:', err);
    res.status(500).json({ error: 'Failed to list promo codes' });
  }
});

/** POST /api/admin/promotions/:id/codes — add one or more promo codes. Body: { codes: string[] } */
router.post('/:id/codes', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Promotion not found' });

    const codes = normalizeCodes(req.body.codes);
    if (!codes.length) return res.status(400).json({ error: 'codes must be a non-empty array of strings' });

    const dup = await prisma.promoCode.findMany({
      where: { normalizedCode: { in: codes.map((c) => c.toLowerCase()) } },
      select: { normalizedCode: true },
    });
    if (dup.length) {
      return res.status(409).json({ error: `Code(s) already exist: ${dup.map((d) => d.normalizedCode.toUpperCase()).join(', ')}` });
    }

    await prisma.promoCode.createMany({
      data: codes.map((code) => ({
        code,
        normalizedCode: code.toLowerCase(),
        type: 'PROMO',
        status: 'ACTIVE',
        promotionId: id,
      })),
    });

    const updated = await prisma.promoCode.findMany({
      where: { promotionId: id },
      orderBy: { id: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
    res.status(201).json({ codes: updated.map((c) => ({ ...c, useCount: c._count.orders })) });
  } catch (err) {
    console.error('Failed to add promo codes:', err);
    res.status(500).json({ error: 'Failed to add promo codes' });
  }
});

/** DELETE /api/admin/promotions/:id/codes/:codeId — remove a promo code (only if unused) */
router.delete('/:id/codes/:codeId', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const codeId = Number(req.params.codeId);
    const code = await prisma.promoCode.findFirst({ where: { id: codeId, promotionId: id }, include: { _count: { select: { orders: true } } } });
    if (!code) return res.status(404).json({ error: 'Promo code not found' });

    if (code._count.orders > 0) {
      return res.status(409).json({ error: 'Cannot delete a promo code that has been used. Disable it instead.' });
    }

    await prisma.promoCode.delete({ where: { id: codeId } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Failed to delete promo code:', err);
    res.status(500).json({ error: 'Failed to delete promo code' });
  }
});

/** DELETE /api/admin/promotions/:id — only when no redemptions exist */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Promotion not found' });

    const redemptions = await prisma.promotionRedemption.count({ where: { promotionId: id } });
    if (redemptions > 0) {
      return res.status(409).json({ error: 'Cannot delete: promotion has redemptions. Archive or pause it instead.' });
    }

    const codes = await prisma.promoCode.count({ where: { promotionId: id } });
    if (codes > 0) {
      return res.status(409).json({ error: 'Cannot delete: promotion has promo codes. Remove codes first.' });
    }

    await prisma.promotion.delete({ where: { id } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Failed to delete promotion:', err);
    res.status(500).json({ error: 'Failed to delete promotion' });
  }
});

export default router;
