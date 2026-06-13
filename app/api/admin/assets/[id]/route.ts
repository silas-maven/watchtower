import { AssetType, Role } from '@prisma/client';
import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

const Schema = z.object({
  name: z.string().min(1).optional(),
  reason: z.string().nullable().optional(),
  assetType: z.nativeEnum(AssetType).optional(),
  currency: z.string().min(2).max(8).nullable().optional(),
  quoteSymbol: z.string().max(24).nullable().optional(),
  targetEntry: z.number().nullable().optional(),
  targetExit: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole([Role.OWNER, Role.ADMIN]);
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
        assetType: data.assetType,
        currency: data.currency === null ? undefined : data.currency?.trim().toUpperCase(),
        quoteSymbol: data.quoteSymbol === undefined ? undefined : data.quoteSymbol?.trim().toUpperCase() || null,
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

    await prisma.adminAssetAction.create({
      data: {
        assetId: id,
        actorProfileId: actor.id,
        action: 'UPDATE_ASSET',
        metadata: {
          fields: Object.keys(data),
        },
      },
    });

    return ok({ asset: updated });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole([Role.OWNER, Role.ADMIN]);
    const { id } = await params;

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return fail('Asset not found', 404, 'NOT_FOUND');

    // Hard delete is destructive and cascades to member holdings/watchlist items.
    // Default to archiving (isActive=false); require ?hard=true to truly remove.
    const hard = new URL(req.url).searchParams.get('hard') === 'true';

    if (!hard) {
      await prisma.asset.update({ where: { id }, data: { isActive: false } });
      await prisma.adminAssetAction.create({
        data: { assetId: id, actorProfileId: actor.id, action: 'ARCHIVE_ASSET', metadata: { symbol: asset.symbol } },
      });
      return ok({ archived: true, symbol: asset.symbol });
    }

    // Record the audit row before the asset row disappears (the FK would cascade it away).
    await prisma.adminAssetAction.create({
      data: { assetId: id, actorProfileId: actor.id, action: 'DELETE_ASSET', metadata: { symbol: asset.symbol } },
    });
    await prisma.asset.delete({ where: { id } });
    return ok({ deleted: true, symbol: asset.symbol });
  } catch (error) {
    return fromCaughtError(error);
  }
}
