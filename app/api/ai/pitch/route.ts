import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { checkPitchQuota } from '@/lib/entitlements';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit, fromCaughtError } from '@/lib/route';
import { buildPitchInputs, generatePitch } from '@/lib/ai/pitch';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
// The free OpenRouter model can queue for minutes before failover.
export const maxDuration = 300;

const Schema = z.object({ assetId: z.string() });

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    // Outer guard. The DB quota below is what actually caps spend; this stops a loop burning through a day's allowance in seconds.
    const limited = enforceRateLimit('model', user.id);
    if (limited) return limited;

    const quota = await checkPitchQuota(user);
    if (!quota.allowed) return fail(quota.reason ?? 'Pitch limit reached', 402, 'PAYWALL');
    const json = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(json);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const inputs = await buildPitchInputs(parsed.data.assetId, user.id);
    if (!inputs) return fail('Asset not found', 404, 'NOT_FOUND');

    const pitch = await generatePitch(inputs);

    await prisma.aiReport
      .create({
        data: {
          kind: 'PITCH',
          profileId: user.id,
          assetId: parsed.data.assetId,
          inputs: inputs as unknown as Prisma.InputJsonValue,
          result: pitch as unknown as Prisma.InputJsonValue,
          model: pitch.model,
        },
      })
      .catch(() => undefined);

    return ok({ pitch });
  } catch (error) {
    return fromCaughtError(error);
  }
}
