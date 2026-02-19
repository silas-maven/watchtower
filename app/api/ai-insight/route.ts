import OpenAI from 'openai';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { OPENAI_MODEL, optionalEnv } from '@/lib/env';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

const Schema = z.object({ assetId: z.string() });

export const runtime = 'nodejs';

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
    await requireRole([Role.OWNER, Role.ADMIN, Role.MEMBER]);
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

    const apiKey = optionalEnv('OPENAI_API_KEY');
    if (!apiKey) {
      return ok({ assetId: asset.id, ...fallback });
    }

    try {
      const client = new OpenAI({ apiKey });
      const response = await client.responses.create({
        model: OPENAI_MODEL,
        input: [
          {
            role: 'system',
            content:
              'You are a concise financial analyst. Return strict JSON with summary (string), bullets (string array max 4), confidence (0-100 number).',
          },
          {
            role: 'user',
            content: JSON.stringify({
              symbol: asset.symbol,
              name: asset.name,
              signalState: latest?.signalState ?? 'NONE',
              currentPrice: latest?.currentPrice,
              dailyChangePct: latest?.dailyChangePct,
              targetEntry: asset.rule?.targetEntry,
              targetExit: asset.rule?.targetExit,
            }),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'asset_insight',
            schema: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                bullets: { type: 'array', items: { type: 'string' } },
                confidence: { type: 'number' },
              },
              required: ['summary', 'bullets', 'confidence'],
              additionalProperties: false,
            },
            strict: true,
          },
        },
      });

      const text = response.output_text?.trim();
      if (!text) return ok({ assetId: asset.id, ...fallback });

      const parsedOutput = JSON.parse(text) as {
        summary?: string;
        bullets?: string[];
        confidence?: number;
      };

      if (!parsedOutput.summary || !Array.isArray(parsedOutput.bullets)) {
        return ok({ assetId: asset.id, ...fallback });
      }

      return ok({
        assetId: asset.id,
        summary: parsedOutput.summary,
        bullets: parsedOutput.bullets.slice(0, 4),
        confidence: Math.max(0, Math.min(100, Math.round(parsedOutput.confidence ?? 60))),
        model: OPENAI_MODEL,
      });
    } catch {
      return ok({ assetId: asset.id, ...fallback });
    }
  } catch (error) {
    return fromCaughtError(error);
  }
}
