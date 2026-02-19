import { Role } from '@prisma/client';
import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

const Schema = z.object({
  name: z.string().min(1).optional(),
  reason: z.string().nullable().optional(),
  targetEntry: z.number().nullable().optional(),
  targetExit: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Invalid update payload', 400, 'INVALID_PAYLOAD');

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return fail('Asset not found', 404, 'NOT_FOUND');

    const data = parsed.data;
    const updated = await prisma.asset.update({
      where: { id },
      data: {
        name: data.name,
        reason: data.reason,
        isActive: data.isActive,
      },
    });

    if (data.targetEntry !== undefined || data.targetExit !== undefined) {
      await prisma.assetRule.upsert({
        where: { assetId: id },
        update: {
          targetEntry: data.targetEntry,
          targetExit: data.targetExit,
        },
        create: {
          assetId: id,
          targetEntry: data.targetEntry ?? null,
          targetExit: data.targetExit ?? null,
        },
      });
    }

    return ok({ asset: updated });
  } catch (error) {
    return fromCaughtError(error);
  }
}
