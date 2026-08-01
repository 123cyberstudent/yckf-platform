import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { toMinorUnits } from '../payments/money.js';

const router = Router();

function serializePackage(p: any) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    baseCredits: p.baseCredits,
    bonusCredits: p.bonusCredits,
    totalCredits: p.totalCredits,
    price: p.price,
    priceGhs: p.price / 100,
    currency: p.currency,
    active: p.active,
    featured: p.featured,
    displayOrder: p.displayOrder,
    promotionLabel: p.promotionLabel,
    startAt: p.startAt,
    endAt: p.endAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/** GET /api/admin/packages — includeInactive=1 to show all */
router.get('/', async (req: Request, res: Response) => {
  try {
    const includeInactive =
      req.query.includeInactive === '1' || req.query.includeInactive === 'true';
    const packages = await prisma.creditPackage.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
    res.json({ packages: packages.map(serializePackage), total: packages.length });
  } catch (err) {
    console.error('Failed to list packages:', err);
    res.status(500).json({ error: 'Failed to list packages' });
  }
});

function validatePackageBody(body: any) {
  const errors: string[] = [];

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) errors.push('name is required');

  const baseCredits = Number(body.baseCredits);
  if (!Number.isFinite(baseCredits) || baseCredits < 0 || !Number.isInteger(baseCredits)) {
    errors.push('baseCredits must be a non-negative integer');
  }

  const bonusCredits = Number(body.bonusCredits ?? 0);
  if (!Number.isFinite(bonusCredits) || bonusCredits < 0 || !Number.isInteger(bonusCredits)) {
    errors.push('bonusCredits must be a non-negative integer');
  }

  const priceGhs = Number(body.priceGhs ?? body.price);
  if (!Number.isFinite(priceGhs) || priceGhs <= 0) {
    errors.push('priceGhs must be a positive amount in GHS');
  }

  const displayOrder = body.displayOrder === undefined || body.displayOrder === null || body.displayOrder === ''
    ? 0
    : Number(body.displayOrder);
  if (!Number.isFinite(displayOrder) || !Number.isInteger(displayOrder)) {
    errors.push('displayOrder must be an integer');
  }

  return { errors, name, baseCredits, bonusCredits, priceMinor: toMinorUnits(priceGhs), displayOrder };
}

/** POST /api/admin/packages — create. Body: name, description?, baseCredits, bonusCredits?, priceGhs, active?, featured?, displayOrder?, promotionLabel?, startAt?, endAt? */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { errors, name, baseCredits, bonusCredits, priceMinor, displayOrder } = validatePackageBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const existing = await prisma.creditPackage.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ error: 'A package with this name already exists' });

    const pkg = await prisma.creditPackage.create({
      data: {
        name,
        description: req.body.description ? String(req.body.description) : null,
        baseCredits,
        bonusCredits,
        totalCredits: baseCredits + bonusCredits,
        price: priceMinor,
        currency: String(req.body.currency ?? 'GHS').toUpperCase(),
        active: req.body.active === true,
        featured: req.body.featured === true,
        displayOrder,
        promotionLabel: req.body.promotionLabel ? String(req.body.promotionLabel) : null,
        startAt: req.body.startAt ? new Date(req.body.startAt) : null,
        endAt: req.body.endAt ? new Date(req.body.endAt) : null,
      },
    });

    res.status(201).json({ package: serializePackage(pkg) });
  } catch (err) {
    console.error('Failed to create package:', err);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

/** PATCH /api/admin/packages/:id — update package fields */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid package id' });

    const existing = await prisma.creditPackage.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Package not found' });

    const data: any = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: 'name cannot be empty' });
      const dup = await prisma.creditPackage.findFirst({ where: { name, NOT: { id } } });
      if (dup) return res.status(409).json({ error: 'A package with this name already exists' });
      data.name = name;
    }

    let totalCredits = existing.totalCredits;
    if (req.body.baseCredits !== undefined) {
      const base = Number(req.body.baseCredits);
      if (!Number.isFinite(base) || base < 0 || !Number.isInteger(base)) {
        return res.status(400).json({ error: 'baseCredits must be a non-negative integer' });
      }
      data.baseCredits = base;
      totalCredits = base + (req.body.bonusCredits !== undefined ? Number(req.body.bonusCredits) : existing.bonusCredits);
    }
    if (req.body.bonusCredits !== undefined) {
      const bonus = Number(req.body.bonusCredits);
      if (!Number.isFinite(bonus) || bonus < 0 || !Number.isInteger(bonus)) {
        return res.status(400).json({ error: 'bonusCredits must be a non-negative integer' });
      }
      data.bonusCredits = bonus;
      totalCredits = (req.body.baseCredits !== undefined ? Number(req.body.baseCredits) : existing.baseCredits) + bonus;
    }
    if (req.body.baseCredits !== undefined || req.body.bonusCredits !== undefined) {
      data.totalCredits = totalCredits;
    }

    if (req.body.priceGhs !== undefined || req.body.price !== undefined) {
      const priceGhs = Number(req.body.priceGhs ?? req.body.price);
      if (!Number.isFinite(priceGhs) || priceGhs <= 0) {
        return res.status(400).json({ error: 'priceGhs must be a positive amount in GHS' });
      }
      data.price = toMinorUnits(priceGhs);
    }

    if (req.body.currency !== undefined) data.currency = String(req.body.currency).toUpperCase();
    if (req.body.description !== undefined) data.description = req.body.description ? String(req.body.description) : null;
    if (req.body.active !== undefined) data.active = req.body.active === true;
    if (req.body.featured !== undefined) data.featured = req.body.featured === true;
    if (req.body.displayOrder !== undefined) {
      const order = Number(req.body.displayOrder);
      if (!Number.isFinite(order) || !Number.isInteger(order)) {
        return res.status(400).json({ error: 'displayOrder must be an integer' });
      }
      data.displayOrder = order;
    }
    if (req.body.promotionLabel !== undefined) {
      data.promotionLabel = req.body.promotionLabel ? String(req.body.promotionLabel) : null;
    }
    if (req.body.startAt !== undefined) data.startAt = req.body.startAt ? new Date(req.body.startAt) : null;
    if (req.body.endAt !== undefined) data.endAt = req.body.endAt ? new Date(req.body.endAt) : null;

    const pkg = await prisma.creditPackage.update({ where: { id }, data });
    res.json({ package: serializePackage(pkg) });
  } catch (err) {
    console.error('Failed to update package:', err);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

/** DELETE /api/admin/packages/:id — only when no order has purchased it */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid package id' });

    const existing = await prisma.creditPackage.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Package not found' });

    const redemptions = await prisma.orderItem.count({
      where: { productType: 'CREDIT_PACKAGE', productId: id },
    });
    if (redemptions > 0) {
      return res.status(409).json({
        error: `Cannot delete: package has ${redemptions} order item(s) referencing it. Deactivate it instead.`,
      });
    }

    await prisma.creditPackage.delete({ where: { id } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Failed to delete package:', err);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

export default router;
