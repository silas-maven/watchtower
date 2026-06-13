import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { getDefaultWatchlist, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const CreateSchema = z.object({ name: z.string().trim().min(1).max(60) });

const MAX_WATCHLISTS = 20;

export async function GET() {
  try {
    const user = await requireUser();
    // Guarantee at least the default list exists.
    await getDefaultWatchlist(user.id);

    const lists = await prisma.userWatchlist.findMany({
      where: { profileId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: { items: { select: { assetId: true } } },
    });

    return ok({
      watchlists: lists.map((l) => ({
        id: l.id,
        name: l.name,
        isDefault: l.isDefault,
        assetIds: l.items.map((i) => i.assetId),
      })),
    });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return fail('A list name is required', 400, 'INVALID_PAYLOAD');

    const count = await prisma.userWatchlist.count({ where: { profileId: user.id } });
    if (count >= MAX_WATCHLISTS) return fail('You have reached the maximum number of lists', 400, 'LIMIT_REACHED');

    const existing = await prisma.userWatchlist.findFirst({ where: { profileId: user.id, name: parsed.data.name } });
    if (existing) return fail('You already have a list with that name', 409, 'NAME_EXISTS');

    const created = await prisma.userWatchlist.create({
      data: { profileId: user.id, name: parsed.data.name, isDefault: count === 0 },
    });

    return ok({ watchlist: { id: created.id, name: created.name, isDefault: created.isDefault, assetIds: [] } });
  } catch (error) {
    return fromCaughtError(error);
  }
}
