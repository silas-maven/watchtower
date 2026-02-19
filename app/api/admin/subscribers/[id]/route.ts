import { Role, SubscriptionStatus } from '@prisma/client';
import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

const Schema = z.object({
  status: z.nativeEnum(SubscriptionStatus),
  dueAt: z.string().datetime().optional().nullable(),
});

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const subscription = await prisma.subscription.findUnique({ where: { userId: id } });
    if (!subscription) return fail('Subscriber not found', 404, 'NOT_FOUND');

    const updated = await prisma.subscription.update({
      where: { userId: id },
      data: {
        status: parsed.data.status,
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
        pausedAt: parsed.data.status === SubscriptionStatus.PAUSED ? new Date() : null,
        removedAt: parsed.data.status === SubscriptionStatus.REMOVED ? new Date() : null,
      },
    });

    return ok({ subscription: updated });
  } catch (error) {
    return fromCaughtError(error);
  }
}
