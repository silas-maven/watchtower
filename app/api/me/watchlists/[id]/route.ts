import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  isDefault: z.literal(true).optional(),
});

async function ownedList(profileId: string, id: string) {
  return prisma.userWatchlist.findFirst({ where: { id, profileId } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const list = await ownedList(user.id, id);
    if (!list) return fail('List not found', 404, 'NOT_FOUND');

    if (parsed.data.name && parsed.data.name !== list.name) {
      const clash = await prisma.userWatchlist.findFirst({
        where: { profileId: user.id, name: parsed.data.name, id: { not: id } },
      });
      if (clash) return fail('You already have a list with that name', 409, 'NAME_EXISTS');
    }

    // Promoting a list to default demotes the others in one transaction.
    if (parsed.data.isDefault) {
      await prisma.$transaction([
        prisma.userWatchlist.updateMany({ where: { profileId: user.id, isDefault: true }, data: { isDefault: false } }),
        prisma.userWatchlist.update({ where: { id }, data: { isDefault: true, name: parsed.data.name ?? undefined } }),
      ]);
    } else if (parsed.data.name) {
      await prisma.userWatchlist.update({ where: { id }, data: { name: parsed.data.name } });
    }

    return ok({ updated: true });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const list = await ownedList(user.id, id);
    if (!list) return fail('List not found', 404, 'NOT_FOUND');

    const total = await prisma.userWatchlist.count({ where: { profileId: user.id } });
    if (total <= 1) return fail('You must keep at least one list', 400, 'LAST_LIST');

    await prisma.userWatchlist.delete({ where: { id } });

    // If the default was removed, promote the oldest remaining list.
    if (list.isDefault) {
      const next = await prisma.userWatchlist.findFirst({ where: { profileId: user.id }, orderBy: { createdAt: 'asc' } });
      if (next) await prisma.userWatchlist.update({ where: { id: next.id }, data: { isDefault: true } });
    }

    return ok({ deleted: true });
  } catch (error) {
    return fromCaughtError(error);
  }
}
