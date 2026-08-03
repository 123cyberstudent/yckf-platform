import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { SUBSCRIPTION_PLANS } from '../subscriptions/constants.js';

const router = Router();

/** GET /api/admin/subscription-plans — manage the fixed plan catalogue. */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] });
    res.json({ plans });
  } catch (err) {
    console.error('Failed to list subscription plans:', err);
    res.status(500).json({ error: 'Failed to list subscription plans' });
  }
});

/** POST /api/admin/subscription-plans — create a plan (prices in GHS pesewas). */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, name, description, pricePesewas, durationUnit, durationValue, active, displayOrder } = req.body ?? {};
    if (!code || !name || !Number.isInteger(pricePesewas) || pricePesewas <= 0) {
      return res.status(400).json({ error: 'code, name and a positive integer pricePesewas are required' });
    }
    const plan = await prisma.subscriptionPlan.create({
      data: {
        code: String(code).trim(),
        name: String(name).trim(),
        description: description ? String(description) : null,
        pricePesewas,
        durationUnit: String(durationUnit ?? 'MONTH').toUpperCase(),
        durationValue: Number(durationValue) || 1,
        active: active === undefined ? true : Boolean(active),
        displayOrder: Number(displayOrder) || 0,
      },
    });
    res.status(201).json({ plan });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2002') {
      return res.status(409).json({ error: 'A plan with this code already exists' });
    }
    console.error('Failed to create subscription plan:', err);
    res.status(500).json({ error: 'Failed to create subscription plan' });
  }
});

/** PATCH /api/admin/subscription-plans/:code — update a plan. */
router.patch('/:code', async (req: Request, res: Response) => {
  try {
    const { name, description, pricePesewas, durationUnit, durationValue, active, displayOrder } = req.body ?? {};
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (description !== undefined) data.description = description === null ? null : String(description);
    if (pricePesewas !== undefined) {
      if (!Number.isInteger(pricePesewas) || pricePesewas <= 0) {
        return res.status(400).json({ error: 'pricePesewas must be a positive integer' });
      }
      data.pricePesewas = pricePesewas;
    }
    if (durationUnit !== undefined) data.durationUnit = String(durationUnit).toUpperCase();
    if (durationValue !== undefined) data.durationValue = Number(durationValue) || 1;
    if (active !== undefined) data.active = Boolean(active);
    if (displayOrder !== undefined) data.displayOrder = Number(displayOrder) || 0;

    const plan = await prisma.subscriptionPlan.update({
      where: { code: String(req.params.code) },
      data,
    });
    res.json({ plan });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') {
      return res.status(404).json({ error: 'Plan not found' });
    }
    console.error('Failed to update subscription plan:', err);
    res.status(500).json({ error: 'Failed to update subscription plan' });
  }
});

/** DELETE /api/admin/subscription-plans/:code — deactivate a plan. */
router.delete('/:code', async (req: Request, res: Response) => {
  try {
    const plan = await prisma.subscriptionPlan.update({
      where: { code: String(req.params.code) },
      data: { active: false },
    });
    res.json({ success: true, plan });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') {
      return res.status(404).json({ error: 'Plan not found' });
    }
    console.error('Failed to deactivate subscription plan:', err);
    res.status(500).json({ error: 'Failed to deactivate subscription plan' });
  }
});

export default router;
