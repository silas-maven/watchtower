import { z } from 'zod';
import { Role } from '@prisma/client';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';

const STATUSES = ['PENDING', 'REVIEWED', 'ADDED', 'DECLINED'] as const;
const PatchSchema = z.object({ id: z.string().min(1), status: z.enum(STATUSES) });

export async function GET() {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const requests = await prisma.stockRequest.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      include: { profile: { select: { name: true, email: true } } },
    });
    return ok({ requests });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const body = await req.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');
    await prisma.stockRequest.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
    return ok({ updated: true });
  } catch (error) {
    return fromCaughtError(error);
  }
}
