import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { fail, ok } from '@/lib/api';
import { checkDailyAiQuota, requirePaid } from '@/lib/entitlements';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit, fromCaughtError } from '@/lib/route';
import { getLivePortfolioView } from '@/lib/server/livePortfolio';
import { getVirtualPortfolioView } from '@/lib/server/virtualPortfolio';
import { runStressTest, type StressHolding } from '@/lib/stressTest';
import { narrateStressTest } from '@/lib/ai/stressNarrative';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const maxDuration = 300;

const Schema = z.object({
  scope: z.enum(['live', 'virtual', 'both']),
  targetValueGBP: z.number().positive().nullable().optional(),
  horizonYears: z.number().min(1).max(40),
});

export async function POST(req: Request) {
  try {
    const user = await requirePaid();
    // Narrating a stress test is a model call with maxDuration 300, and this was
    // the one AI route with no quota at all. It already persists a STRESS_TEST
    // AiReport, so the existing per-day DB counter works with no schema change.
    const limited = enforceRateLimit('model', user.id);
    if (limited) return limited;
    const quota = await checkDailyAiQuota(user, 'STRESS_TEST', { free: 3, paid: 25 });
    if (!quota.allowed) return fail(quota.reason ?? 'Daily limit reached', 429, 'QUOTA_EXCEEDED');

    const json = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(json);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');
    const { scope, horizonYears } = parsed.data;
    const targetValueGBP = parsed.data.targetValueGBP ?? null;

    const [live, virtual] = await Promise.all([
      scope !== 'virtual' ? getLivePortfolioView(user.id) : null,
      scope !== 'live' ? getVirtualPortfolioView(user.id) : null,
    ]);

    const holdings: StressHolding[] = [];
    let cashGBP = 0;
    for (const view of [live, virtual]) {
      if (!view) continue;
      for (const h of view.holdings) {
        if (h.valueGBP != null && h.valueGBP > 0) {
          holdings.push({ symbol: h.symbol, valueGBP: h.valueGBP, beta: h.beta, currency: h.currency });
        }
      }
      cashGBP += Math.max(0, view.summary.cashGBP ?? 0);
    }

    if (holdings.length === 0 && cashGBP <= 0) {
      return fail('No holdings or cash to stress test. Add positions first.', 400, 'EMPTY_PORTFOLIO');
    }

    const result = runStressTest({ holdings, cashGBP, targetValueGBP, horizonYears });
    const narrative = await narrateStressTest(result);

    await prisma.aiReport
      .create({
        data: {
          kind: 'STRESS_TEST',
          profileId: user.id,
          inputs: { scope, targetValueGBP, horizonYears, holdings, cashGBP } as unknown as Prisma.InputJsonValue,
          result: { result, narrative } as unknown as Prisma.InputJsonValue,
          model: narrative.model,
        },
      })
      .catch(() => undefined);

    return ok({ result, narrative });
  } catch (error) {
    return fromCaughtError(error);
  }
}
