import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { getLivePortfolioView } from '@/lib/server/livePortfolio';
import { getVirtualPortfolioView } from '@/lib/server/virtualPortfolio';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const Schema = z.object({
  spartanEnabled: z.boolean().optional(),
  manualNextBuyPrice: z.number().positive().nullable().optional(),
  manualSellTarget: z.number().positive().nullable().optional(),
  averagePlanId: z.string().min(1).nullable().optional(),
});

// Per-holding controls: Spartan toggle, manual next-buy/sell (when Spartan off),
// and link/unlink an averaging plan. Works for both live + virtual holdings.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const holding = await prisma.userHolding.findFirst({ where: { id, profileId: user.id } });
    if (!holding) return fail('Holding not found', 404, 'NOT_FOUND');

    const data: Record<string, unknown> = {};
    if (parsed.data.spartanEnabled !== undefined) data.spartanEnabled = parsed.data.spartanEnabled;
    if (parsed.data.manualNextBuyPrice !== undefined) data.manualNextBuyPrice = parsed.data.manualNextBuyPrice;
    if (parsed.data.manualSellTarget !== undefined) data.manualSellTarget = parsed.data.manualSellTarget;

    if (parsed.data.averagePlanId !== undefined) {
      if (parsed.data.averagePlanId === null) {
        data.averagePlanId = null;
      } else {
        const plan = await prisma.averagePlan.findFirst({ where: { id: parsed.data.averagePlanId, profileId: user.id } });
        if (!plan) return fail('Plan not found', 404, 'NOT_FOUND');
        if (plan.assetId !== holding.assetId) return fail('Plan is for a different asset', 400, 'ASSET_MISMATCH');
        const otherHolding = await prisma.userHolding.findFirst({ where: { averagePlanId: plan.id, id: { not: holding.id } } });
        if (otherHolding) return fail('Plan already linked to another holding', 409, 'PLAN_LINKED');
        data.averagePlanId = plan.id;
      }
    }

    await prisma.userHolding.update({ where: { id: holding.id }, data });

    const view = holding.portfolioId == null
      ? await getLivePortfolioView(user.id)
      : await getVirtualPortfolioView(user.id);
    return ok({ portfolioId: holding.portfolioId, view });
  } catch (error) {
    return fromCaughtError(error);
  }
}
