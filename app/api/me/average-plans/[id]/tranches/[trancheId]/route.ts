import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { fetchFxRates } from '@/lib/market/fx';
import { syncHoldingFromExecutedTranches, toPlanLite } from '@/lib/spartan';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const Schema = z.object({ executed: z.boolean() });

// Toggle a tranche's executed flag. Executed tranches define the real holding, so
// if this plan is linked to a holding, recompute that holding's shares + avg price.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; trancheId: string }> }) {
  try {
    const user = await requireUser();
    const { id, trancheId } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const plan = await prisma.averagePlan.findFirst({ where: { id, profileId: user.id }, include: { holding: true } });
    if (!plan) return fail('Plan not found', 404, 'NOT_FOUND');

    const tranche = await prisma.averagePlanTranche.findFirst({ where: { id: trancheId, planId: id } });
    if (!tranche) return fail('Tranche not found', 404, 'NOT_FOUND');

    await prisma.averagePlanTranche.update({
      where: { id: trancheId },
      data: { executed: parsed.data.executed, executedAt: parsed.data.executed ? new Date() : null },
    });

    let syncedHolding = false;
    if (plan.holding) {
      const fresh = await prisma.averagePlan.findUnique({ where: { id }, include: { tranches: { orderBy: { orderIndex: 'asc' } } } });
      const lite = toPlanLite(fresh);
      if (lite) {
        const fx = await fetchFxRates();
        const sync = syncHoldingFromExecutedTranches(lite, fx);
        await prisma.userHolding.update({
          where: { id: plan.holding.id },
          data: { shares: sync.shares, averagePrice: sync.averagePrice, investedGBP: sync.investedGBP },
        });
        syncedHolding = true;
      }
    }

    const full = await prisma.averagePlan.findUnique({ where: { id }, include: { tranches: { orderBy: { orderIndex: 'asc' } } } });
    return ok({ plan: full, syncedHolding });
  } catch (error) {
    return fromCaughtError(error);
  }
}
