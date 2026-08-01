import { Prisma } from '@prisma/client';
import { prisma } from '../shared/db.js';
import { WalletTransactionTypeValue } from './constants.js';
import { PaymentError, PaymentErrorCode } from './errors.js';

export interface CreditTransactionInput {
  userId: number;
  type: WalletTransactionTypeValue;
  /** Signed amount in minor units: positive = credit, negative = debit. */
  amount: number;
  idempotencyKey: string;
  description?: string;
  sourceType?: string;
  sourceId?: number;
  expiresAt?: Date | null;
  createdByUserId?: number | null;
}

export interface CreditTransactionResult {
  id: number;
  balanceAfter: number;
  existedBefore: boolean;
}

/** Lazily create the wallet row for a user if it does not exist yet. */
export async function ensureWallet(userId: number) {
  return prisma.creditWallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function getWallet(userId: number) {
  const existing = await prisma.creditWallet.findUnique({
    where: { userId },
  });
  if (existing) return existing;
  return ensureWallet(userId);
}

export async function getWalletWithLedger(userId: number, limit = 100, cursor?: number) {
  await ensureWallet(userId);
  const wallet = await prisma.creditWallet.findUniqueOrThrow({ where: { userId } });
  const entries = await prisma.creditLedgerEntry.findMany({
    where: { userId, ...(cursor ? { id: { lt: cursor } } : {}) },
    orderBy: { id: 'desc' },
    take: limit,
  });
  return { wallet, entries };
}

/**
 * Record a wallet transaction and atomically update the balance.
 *
 * Idempotency: if a ledger entry already exists for `idempotencyKey`,
 * it is returned as-is (balance is never double-applied). A unique
 * constraint on the ledger table is the backstop against races.
 */
export async function recordCreditTransaction(input: CreditTransactionInput): Promise<CreditTransactionResult> {
  const existing = await prisma.creditLedgerEntry.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) {
    return { id: existing.id, balanceAfter: existing.balanceAfter, existedBefore: true };
  }

  try {
    const entry = await prisma.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.upsert({
        where: { userId: input.userId },
        create: { userId: input.userId },
        update: {},
      });

      const balanceAfter = wallet.availableBalance + input.amount;
      if (balanceAfter < 0) {
        throw new PaymentError(
          PaymentErrorCode.INSUFFICIENT_CREDITS,
          'Insufficient credit balance',
          409,
          { availableBalance: wallet.availableBalance, requested: input.amount }
        );
      }

      const entry = await tx.creditLedgerEntry.create({
        data: {
          walletId: wallet.id,
          userId: input.userId,
          type: input.type,
          amount: input.amount,
          balanceBefore: wallet.availableBalance,
          balanceAfter,
          description: input.description,
          idempotencyKey: input.idempotencyKey,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          expiresAt: input.expiresAt,
          createdByUserId: input.createdByUserId,
        },
      });

      const lifetime = {
        lifetimePurchased: undefined as number | undefined,
        lifetimeBonus: undefined as number | undefined,
        lifetimeSpent: undefined as number | undefined,
      };
      if (input.type === 'PURCHASE' && input.amount > 0) lifetime.lifetimePurchased = input.amount;
      if (['PROMOTION_BONUS', 'SIGNUP_BONUS', 'REFERRAL_BONUS'].includes(input.type) && input.amount > 0) {
        lifetime.lifetimeBonus = input.amount;
      }
      if (input.type === 'COURSE_PURCHASE') lifetime.lifetimeSpent = Math.abs(input.amount);

      await tx.creditWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: balanceAfter,
          ...(lifetime.lifetimePurchased !== undefined ? { lifetimePurchased: { increment: lifetime.lifetimePurchased } } : {}),
          ...(lifetime.lifetimeBonus !== undefined ? { lifetimeBonus: { increment: lifetime.lifetimeBonus } } : {}),
          ...(lifetime.lifetimeSpent !== undefined ? { lifetimeSpent: { increment: lifetime.lifetimeSpent } } : {}),
        },
      });

      return entry;
    });

    return { id: entry.id, balanceAfter: entry.balanceAfter, existedBefore: false };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const existing = await prisma.creditLedgerEntry.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return { id: existing.id, balanceAfter: existing.balanceAfter, existedBefore: true };
      }
    }
    throw err;
  }
}
