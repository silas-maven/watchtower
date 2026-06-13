import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { getLivePortfolioView } from '@/lib/server/livePortfolio';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const HoldingSchema = z.object({
  assetId: z.string().min(1),
  shares: z.number().nonnegative().nullable(),
  averagePrice: z.number().nonnegative().nullable(),
});

const SizeSchema = z.object({ declaredSizeGBP: z.number().nonnegative().max(1_000_000_000).nullable() });

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getLivePortfolioView(user.id));
  } catch (error) {
    return fromCaughtError(error);
  }
}

// Upsert a real holding (portfolioId is null). A compound unique containing a
// null does not upsert reliably in Postgres, so resolve by findFirst.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = HoldingSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid holding payload', 400, 'INVALID_PAYLOAD');

    const asset = await prisma.asset.findUnique({ where: { id: parsed.data.assetId } });
    if (!asset || !asset.isActive) return fail('Asset not found', 404, 'NOT_FOUND');

    const existing = await prisma.userHolding.findFirst({
      where: { profileId: user.id, assetId: parsed.data.assetId, portfolioId: null },
    });
    if (existing) {
      await prisma.userHolding.update({
        where: { id: existing.id },
        data: { shares: parsed.data.shares, averagePrice: parsed.data.averagePrice },
      });
    } else {
      await prisma.userHolding.create({
        data: {
          profileId: user.id,
          portfolioId: null,
          assetId: parsed.data.assetId,
          shares: parsed.data.shares,
          averagePrice: parsed.data.averagePrice,
        },
      });
    }

    return ok(await getLivePortfolioView(user.id));
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = SizeSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    await prisma.profile.update({ where: { id: user.id }, data: { declaredPortfolioGBP: parsed.data.declaredSizeGBP } });
    return ok(await getLivePortfolioView(user.id));
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const assetId = new URL(req.url).searchParams.get('assetId');
    if (!assetId) return fail('assetId is required', 400, 'INVALID_PAYLOAD');

    await prisma.userHolding.deleteMany({ where: { profileId: user.id, assetId, portfolioId: null } });
    return ok(await getLivePortfolioView(user.id));
  } catch (error) {
    return fromCaughtError(error);
  }
}
