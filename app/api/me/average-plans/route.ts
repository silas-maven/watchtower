import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser, getDefaultWatchlist } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { fetchFxRates } from '@/lib/market/fx';
import { computeAveragingPlan } from '@/lib/portfolio';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const TrancheSchema = z.object({
  price: z.number().positive(),
  budgetGBP: z.number().nonnegative().nullable().optional(),
});

const PlanSchema = z.object({
  assetId: z.string().min(1),
  currency: z.string().min(1).max(8).optional(),
  basePrice: z.number().positive(),
  targetSellPrice: z.number().positive().nullable().optional(),
  tranches: z.array(TrancheSchema).min(1).max(12),
  linkHoldingId: z.string().min(1).nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const assetId = new URL(req.url).searchParams.get('assetId');
    const plans = await prisma.averagePlan.findMany({
      where: { profileId: user.id, ...(assetId ? { assetId } : {}) },
      include: {
        tranches: { orderBy: { orderIndex: 'asc' } },
        asset: { select: { symbol: true, name: true, currency: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return ok({ plans });
  } catch (error) {
    return fromCaughtError(error);
  }
}

// Upsert the member's plan for an asset (one plan per profile+asset). Replaces tranches.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = PlanSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid plan payload', 400, 'INVALID_PAYLOAD');
    const { assetId, basePrice, targetSellPrice, tranches, linkHoldingId } = parsed.data;

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset || !asset.isActive) return fail('Asset not found', 404, 'NOT_FOUND');

    // The stock must be on the member's watchlist (planner offers "Add to Watchlist" otherwise).
    const watchlist = await getDefaultWatchlist(user.id);
    const onList = await prisma.userWatchlistItem.findFirst({ where: { watchlistId: watchlist.id, assetId } });
    if (!onList) return fail('Add this stock to your watchlist first', 409, 'NOT_ON_WATCHLIST');

    const currency = parsed.data.currency ?? asset.currency;
    const fx = await fetchFxRates();
    const projection = computeAveragingPlan(
      tranches.filter((t) => t.budgetGBP != null && t.budgetGBP > 0).map((t) => ({ budgetGBP: t.budgetGBP as number, targetPrice: t.price })),
      currency,
      fx,
    );

    const existing = await prisma.averagePlan.findFirst({ where: { profileId: user.id, assetId } });

    const plan = await prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.averagePlan.update({
            where: { id: existing.id },
            data: { currency, basePrice, targetSellPrice: targetSellPrice ?? null, calculatedAveragePrice: projection.averagePrice, calculatedShares: projection.totalShares },
          })
        : await tx.averagePlan.create({
            data: { profileId: user.id, assetId, currency, basePrice, targetSellPrice: targetSellPrice ?? null, calculatedAveragePrice: projection.averagePrice, calculatedShares: projection.totalShares },
          });
      await tx.averagePlanTranche.deleteMany({ where: { planId: saved.id } });
      await tx.averagePlanTranche.createMany({
        data: tranches.map((t, i) => ({ planId: saved.id, orderIndex: i, price: t.price, budgetGBP: t.budgetGBP ?? null })),
      });
      return saved;
    });

    // Optional link from a holding's "Create Average Plan" (1:1 — clear any prior link).
    if (linkHoldingId) {
      const holding = await prisma.userHolding.findFirst({ where: { id: linkHoldingId, profileId: user.id, assetId } });
      if (holding) {
        await prisma.userHolding.updateMany({ where: { averagePlanId: plan.id, id: { not: holding.id } }, data: { averagePlanId: null } });
        await prisma.userHolding.update({ where: { id: holding.id }, data: { averagePlanId: plan.id, spartanEnabled: true } });
      }
    }

    const full = await prisma.averagePlan.findUnique({
      where: { id: plan.id },
      include: { tranches: { orderBy: { orderIndex: 'asc' } } },
    });
    return ok({ plan: full });
  } catch (error) {
    return fromCaughtError(error);
  }
}
