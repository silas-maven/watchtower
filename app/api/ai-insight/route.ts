import { Role } from '@prisma/client';
import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { callJsonModel, hasLlmProvider } from '@/lib/ai/llm';
import { checkDailyAiQuota } from '@/lib/entitlements';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit, fromCaughtError } from '@/lib/route';

const Schema = z.object({ assetId: z.string() });

export const runtime = 'nodejs';
export const maxDuration = 180;

function fallbackInsight(symbol: string, state: string) {
  return {
    summary: `${symbol}: signal state ${state}. Validate entry/exit levels before action.`,
    bullets: [
      'Confirm target levels against current trend and volatility.',
      'Check position sizing against portfolio limits.',
      'Review whether this asset moved into or out of signal range today.',
    ],
    confidence: 62,
    model: 'deterministic-fallback',
  };
}

export async function POST(req: Request) {
  try {
    const user = await requireRole([Role.OWNER, Role.ADMIN, Role.MEMBER]);
    // This endpoint spends money on a model call and is reachable by any
    // signed-in profile, including a free one. Two guards, because one is not
    // enough at several hundred members:
    //
    //   the rate limit  stops a burst, but is per lambda instance, so its real
    //                   ceiling is the limit times however many are warm
    //   the DB quota    is the actual spend control, counted in rows, and cannot
    //                   be reset by landing on a cold instance
    const limited = enforceRateLimit('model', user.id);
    if (limited) return limited;
    const quota = await checkDailyAiQuota(user, 'ASSET_INSIGHT', { free: 5, paid: 50 });
    if (!quota.allowed) return fail(quota.reason ?? 'Daily limit reached', 429, 'QUOTA_EXCEEDED');

    const json = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(json);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const asset = await prisma.asset.findUnique({
      where: { id: parsed.data.assetId },
      include: { rule: true, snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
    });
    if (!asset) return fail('Asset not found', 404, 'NOT_FOUND');

    const latest = asset.snapshots[0];
    const fallback = fallbackInsight(asset.symbol, latest?.signalState ?? 'NONE');

    if (!hasLlmProvider()) {
      return ok({ assetId: asset.id, ...fallback });
    }

    try {
      const { text, model } = await callJsonModel(
        'You are a concise financial analyst. Return a strict JSON object with summary (string), bullets (string array, max 4), confidence (number 0-100). Use UK English. Do not predict prices.',
        JSON.stringify({
          symbol: asset.symbol,
          name: asset.name,
          signalState: latest?.signalState ?? 'NONE',
          currentPrice: latest?.currentPrice,
          dailyChangePct: latest?.dailyChangePct,
          targetEntry: asset.rule?.targetEntry,
          targetExit: asset.rule?.targetExit,
        }),
      );

      if (!text) return ok({ assetId: asset.id, ...fallback });

      const parsedOutput = JSON.parse(text) as {
        summary?: string;
        bullets?: string[];
        confidence?: number;
      };

      if (!parsedOutput.summary || !Array.isArray(parsedOutput.bullets)) {
        return ok({ assetId: asset.id, ...fallback });
      }

      const insight = {
        summary: parsedOutput.summary,
        bullets: parsedOutput.bullets.slice(0, 4),
        confidence: Math.max(0, Math.min(100, Math.round(parsedOutput.confidence ?? 60))),
        model,
      };

      // Persist the row the quota counts. Written only on the path that actually
      // reached the model: the deterministic fallback above costs nothing, so
      // charging a member's daily allowance for it would meter our own outage.
      // Fire and forget, because failing to record a usage row is not a reason to
      // withhold a result the member has already paid for in compute.
      void prisma.aiReport
        .create({
          data: {
            kind: 'ASSET_INSIGHT',
            profileId: user.id,
            assetId: asset.id,
            inputs: { assetId: asset.id, symbol: asset.symbol },
            result: insight,
            model,
          },
        })
        .catch(() => undefined);

      return ok({ assetId: asset.id, ...insight });
    } catch {
      return ok({ assetId: asset.id, ...fallback });
    }
  } catch (error) {
    return fromCaughtError(error);
  }
}
