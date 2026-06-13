import { Role, SignalOverride } from '@prisma/client';
import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { computeSignalState, effectiveSignalState, eventTypeForTransition } from '@/lib/signals/engine';

export const runtime = 'nodejs';

const Schema = z.object({
  override: z.nativeEnum(SignalOverride).nullable(),
  note: z.string().max(280).nullable().optional(),
});

/**
 * Owner manual signal control. Setting an override pins the asset's signal to
 * BUY/SELL/NONE regardless of the price calculation; clearing it (null) returns
 * the asset to deterministic behaviour. The transition is recorded as a
 * SignalEvent flagged manual so the timeline and member views stay truthful.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole([Role.OWNER, Role.ADMIN]);
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Invalid override payload', 400, 'INVALID_PAYLOAD');

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { rule: true, snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
    });
    if (!asset) return fail('Asset not found', 404, 'NOT_FOUND');

    const snapshot = asset.snapshots[0];
    const computed = computeSignalState({
      dailyLow: snapshot?.dailyLow ?? null,
      dailyHigh: snapshot?.dailyHigh ?? null,
      targetEntry: asset.rule?.targetEntry ?? null,
      targetExit: asset.rule?.targetExit ?? null,
    });

    const fromState = effectiveSignalState(computed, asset.rule?.signalOverride);
    const toState = effectiveSignalState(computed, parsed.data.override);

    const rule = await prisma.assetRule.upsert({
      where: { assetId: id },
      update: {
        signalOverride: parsed.data.override,
        overrideNote: parsed.data.note ?? null,
        overrideSetAt: parsed.data.override ? new Date() : null,
        overrideSetById: parsed.data.override ? actor.id : null,
      },
      create: {
        assetId: id,
        signalOverride: parsed.data.override,
        overrideNote: parsed.data.note ?? null,
        overrideSetAt: parsed.data.override ? new Date() : null,
        overrideSetById: parsed.data.override ? actor.id : null,
      },
    });

    // Keep the newest snapshot's stored state consistent with the override so
    // the next refresh compares against the right baseline.
    if (snapshot && snapshot.signalState !== toState) {
      await prisma.assetSnapshot.update({ where: { id: snapshot.id }, data: { signalState: toState } });
    }

    const eventType = eventTypeForTransition(fromState, toState);
    if (eventType) {
      await prisma.signalEvent.create({
        data: {
          assetId: id,
          eventType,
          fromState,
          toState,
          metadata: {
            symbol: asset.symbol,
            manual: true,
            override: parsed.data.override,
            actorProfileId: actor.id,
          },
        },
      });
    }

    await prisma.adminAssetAction.create({
      data: {
        assetId: id,
        actorProfileId: actor.id,
        action: parsed.data.override ? 'SET_SIGNAL_OVERRIDE' : 'CLEAR_SIGNAL_OVERRIDE',
        metadata: { override: parsed.data.override, fromState, toState },
      },
    });

    return ok({
      override: rule.signalOverride,
      note: rule.overrideNote,
      signalState: toState,
      isManualSignal: rule.signalOverride != null,
    });
  } catch (error) {
    return fromCaughtError(error);
  }
}
