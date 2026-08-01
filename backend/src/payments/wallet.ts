import { Router } from 'express';
import { AuthRequest, isAdmin, verifyToken } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';
import { prisma } from '../shared/db.js';
import { getWalletWithLedger, recordCreditTransaction } from './walletService.js';
import { WalletTransactionType } from './constants.js';
import { PaymentError, PaymentErrorCode } from './errors.js';
import { randomUUID } from 'crypto';

const router = Router();

router.use(verifyToken, generalRateLimiter);

/** GET /api/wallet — current balance + lifetime stats */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { wallet } = await getWalletWithLedger(req.user!.id, 1);
    res.json({
      success: true,
      wallet: {
        availableBalance: wallet.availableBalance,
        reservedBalance: wallet.reservedBalance,
        lifetimePurchased: wallet.lifetimePurchased,
        lifetimeBonus: wallet.lifetimeBonus,
        lifetimeSpent: wallet.lifetimeSpent,
      },
    });
  } catch (err) {
    console.error('Failed to load wallet:', err);
    res.status(500).json({ success: false, error: 'Failed to load wallet' });
  }
});

/** GET /api/wallet/ledger?limit=50&cursor=<entryId> — paginated history */
router.get('/ledger', async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const { entries } = await getWalletWithLedger(req.user!.id, limit, cursor);
    res.json({
      success: true,
      entries: entries.map((e) => ({
        id: e.id,
        type: e.type,
        amount: e.amount,
        balanceAfter: e.balanceAfter,
        description: e.description,
        createdAt: e.createdAt,
      })),
      nextCursor: entries.length === limit ? entries[entries.length - 1]?.id : null,
    });
  } catch (err) {
    console.error('Failed to load ledger:', err);
    res.status(500).json({ success: false, error: 'Failed to load ledger' });
  }
});

/** POST /api/wallet/transactions — admin manual adjustment */
router.post('/transactions', isAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId, amount, description } = req.body ?? {};
    const parsedAmount = Number(amount);
    if (!Number.isInteger(userId) || !Number.isFinite(parsedAmount) || parsedAmount === 0) {
      return res.status(400).json({ success: false, error: 'userId and a non-zero integer amount are required' });
    }
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const result = await recordCreditTransaction({
      userId,
      type: WalletTransactionType.ADMIN_ADJUSTMENT,
      amount: parsedAmount,
      idempotencyKey: `admin-adjust-${randomUUID()}`,
      description: description ?? `Admin adjustment (by user ${req.user!.id})`,
      createdByUserId: req.user!.id,
    });

    res.json({ success: true, balanceAfter: result.balanceAfter, entryId: result.id });
  } catch (err) {
    if (err instanceof PaymentError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    console.error('Failed to adjust wallet:', err);
    res.status(500).json({ success: false, error: 'Failed to adjust wallet' });
  }
});

export default router;
