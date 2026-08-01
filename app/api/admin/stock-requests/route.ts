import { z } from 'zod';
import { Role } from '@prisma/client';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { DECIDED_STATUSES, REQUEST_STATUSES, type RequestStatus } from '@/lib/securityRequests';

export const runtime = 'nodejs';

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(REQUEST_STATUSES),
  adminNote: z.string().trim().max(280).optional().nullable(),
});

export async function GET() {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);

    const requests = await prisma.stockRequest.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 300,
      include: {
        profile: { select: { id: true, name: true, email: true, tier: true } },
        decidedBy: { select: { name: true } },
      },
    });

    // Which requested symbols the academy already tracks. Shown against the row
    // so an admin is not asked to research something already on the watchlist.
    const symbols = [...new Set(requests.map((r) => r.symbol))];
    const tracked = symbols.length
      ? await prisma.asset.findMany({
          where: { symbol: { in: symbols }, isActive: true },
          select: { symbol: true, name: true },
        })
      : [];
    const trackedBySymbol = Object.fromEntries(tracked.map((a) => [a.symbol, a.name]));

    return ok({ requests, trackedBySymbol });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireRole([Role.OWNER, Role.ADMIN]);
    const body = await req.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const decided = DECIDED_STATUSES.includes(parsed.data.status as RequestStatus);
    const updated = await prisma.stockRequest.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status,
        // A note is optional, but never wipe an existing one by omitting it.
        ...(parsed.data.adminNote !== undefined ? { adminNote: parsed.data.adminNote || null } : {}),
        // Record who closed it and when. Moving it back to an open state clears
        // the stamp, so the trail always describes the current state.
        decidedAt: decided ? new Date() : null,
        decidedById: decided ? actor.id : null,
      },
      include: { decidedBy: { select: { name: true } } },
    });

    return ok({ request: updated });
  } catch (error) {
    return fromCaughtError(error);
  }
}
