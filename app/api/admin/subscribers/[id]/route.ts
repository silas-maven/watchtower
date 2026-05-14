import { AccessState, Role, SubscriptionStatus } from '@prisma/client';
import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

const Schema = z.object({
  status: z.nativeEnum(SubscriptionStatus).optional(),
  accessState: z.nativeEnum(AccessState).optional(),
  dueAt: z.string().datetime().optional().nullable(),
  reason: z.string().optional().nullable(),
});

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole([Role.OWNER, Role.ADMIN]);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) return fail('Subscriber not found', 404, 'NOT_FOUND');

    const updates = [];
    if (parsed.data.accessState) {
      updates.push(prisma.profile.update({
        where: { id },
        data: { accessState: parsed.data.accessState, accessNote: parsed.data.reason ?? undefined },
      }));
      updates.push(prisma.adminAccessAction.create({
        data: {
          targetProfileId: id,
          actorProfileId: actor.id,
          fromState: profile.accessState,
          toState: parsed.data.accessState,
          reason: parsed.data.reason ?? null,
        },
      }));
    }

    if (parsed.data.status) {
      updates.push(prisma.subscriptionMirror.upsert({
        where: { profileId: id },
        update: {
          status: parsed.data.status,
          currentPeriodEnd: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
        },
        create: {
          profileId: id,
          status: parsed.data.status,
          currentPeriodEnd: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
        },
      }));
    }

    await prisma.$transaction(updates);
    const updated = await prisma.profile.findUnique({ where: { id }, include: { subscriptionMirror: true } });
    return ok({ subscriber: updated });
  } catch (error) {
    return fromCaughtError(error);
  }
}
