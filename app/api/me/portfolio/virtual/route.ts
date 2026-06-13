import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { getOrCreateVirtualPortfolio, getVirtualPortfolioView } from '@/lib/server/virtualPortfolio';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const HoldingSchema = z.object({
  assetId: z.string().min(1),
  shares: z.number().nonnegative().nullable(),
  averagePrice: z.number().nonnegative().nullable(),
});

const SettingsSchema = z.object({
  sizeGBP: z.number().positive().max(100_000_000).optional(),
  budgetPerStockGBP: z.number().nonnegative().nullable().optional(),
  minEntryGBP: z.number().nonnegative().nullable().optional(),
  targetHoldingsCount: z.number().int().nonnegative().max(100).nullable().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const view = await getVirtualPortfolioView(user.id);
    return ok(view);
  } catch (error) {
    return fromCaughtError(error);
  }
}

// Upsert a paper holding into the member's virtual portfolio.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = HoldingSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid holding payload', 400, 'INVALID_PAYLOAD');

    const asset = await prisma.asset.findUnique({ where: { id: parsed.data.assetId } });
    if (!asset || !asset.isActive) return fail('Asset not found', 404, 'NOT_FOUND');

    const portfolio = await getOrCreateVirtualPortfolio(user.id);
    await prisma.userHolding.upsert({
      where: { profileId_assetId_portfolioId: { profileId: user.id, assetId: parsed.data.assetId, portfolioId: portfolio.id } },
      update: { shares: parsed.data.shares, averagePrice: parsed.data.averagePrice },
      create: {
        profileId: user.id,
        portfolioId: portfolio.id,
        assetId: parsed.data.assetId,
        shares: parsed.data.shares,
        averagePrice: parsed.data.averagePrice,
      },
    });

    const view = await getVirtualPortfolioView(user.id);
    return ok(view);
  } catch (error) {
    return fromCaughtError(error);
  }
}

// Update portfolio settings (size, constraints).
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = SettingsSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid settings payload', 400, 'INVALID_PAYLOAD');

    const portfolio = await getOrCreateVirtualPortfolio(user.id);
    await prisma.userPortfolio.update({
      where: { id: portfolio.id },
      data: {
        declaredValueGBP: parsed.data.sizeGBP,
        budgetPerStockGBP: parsed.data.budgetPerStockGBP,
        minEntryGBP: parsed.data.minEntryGBP,
        targetHoldingsCount: parsed.data.targetHoldingsCount,
      },
    });

    const view = await getVirtualPortfolioView(user.id);
    return ok(view);
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const assetId = new URL(req.url).searchParams.get('assetId');
    if (!assetId) return fail('assetId is required', 400, 'INVALID_PAYLOAD');

    const portfolio = await getOrCreateVirtualPortfolio(user.id);
    await prisma.userHolding.deleteMany({ where: { profileId: user.id, portfolioId: portfolio.id, assetId } });

    const view = await getVirtualPortfolioView(user.id);
    return ok(view);
  } catch (error) {
    return fromCaughtError(error);
  }
}
