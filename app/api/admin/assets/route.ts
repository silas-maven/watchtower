import { AssetType, Role, SignalState } from '@prisma/client';
import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

const CreateSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  reason: z.string().optional().nullable(),
  assetType: z.nativeEnum(AssetType),
  currency: z.string().min(2).max(8),
  quoteSymbol: z.string().max(24).optional().nullable(),
  targetEntry: z.number().nullable().optional(),
  targetExit: z.number().nullable().optional(),
  currentPrice: z.number().nullable().optional(),
  dailyHigh: z.number().nullable().optional(),
  dailyLow: z.number().nullable().optional(),
});

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);

    const assets = await prisma.asset.findMany({
      where: { isActive: true },
      include: {
        rule: true,
        snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
      },
      orderBy: { symbol: 'asc' },
    });

    return ok({ assets });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole([Role.OWNER, Role.ADMIN]);

    const body = await req.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const input = parsed.data;
    const symbol = input.symbol.trim().toUpperCase();

    // Duplicate protection. The symbol column is unique, so an exact clash was
    // always caught, but two OTHER routes to a duplicate were not:
    //
    //   1. A deactivated asset still holds its symbol. The old check rejected
    //      the add with "already exists" while the asset was nowhere on the
    //      watchlist, leaving no way forward from the UI. 61 assets are
    //      currently inactive, so this was reachable. Now it says so and offers
    //      reactivation as the fix.
    //   2. Two different symbols can point at the same quoteSymbol, which is
    //      the same instrument priced twice under two rows. Nothing stopped it.
    const existing = await prisma.asset.findUnique({ where: { symbol } });
    if (existing) {
      return existing.isActive
        ? fail(`${symbol} is already on the watchlist as ${existing.name}.`, 409, 'SYMBOL_EXISTS')
        : fail(
            `${symbol} exists but is deactivated (${existing.name}). Reactivate it from the catalogue instead of adding it again.`,
            409,
            'SYMBOL_INACTIVE',
          );
    }

    const quoteSymbol = input.quoteSymbol?.trim().toUpperCase() || null;
    if (quoteSymbol) {
      const sameInstrument = await prisma.asset.findFirst({
        where: { quoteSymbol, isActive: true },
        select: { symbol: true, name: true },
      });
      if (sameInstrument) {
        return fail(
          `${quoteSymbol} is already priced under ${sameInstrument.symbol} (${sameInstrument.name}). Adding it again would track the same instrument twice.`,
          409,
          'INSTRUMENT_EXISTS',
        );
      }
    }

    const created = await prisma.asset.create({
      data: {
        symbol,
        name: input.name.trim(),
        reason: input.reason?.trim() || null,
        assetType: input.assetType,
        currency: input.currency.trim().toUpperCase(),
        quoteSymbol,
        isActive: true,
        rule: {
          create: {
            targetEntry: input.targetEntry ?? null,
            targetExit: input.targetExit ?? null,
          },
        },
      },
      include: { rule: true },
    });

    if (input.currentPrice != null || input.dailyHigh != null || input.dailyLow != null) {
      await prisma.assetSnapshot.create({
        data: {
          assetId: created.id,
          signalState: SignalState.NONE,
          currentPrice: input.currentPrice ?? null,
          dailyHigh: input.dailyHigh ?? null,
          dailyLow: input.dailyLow ?? null,
          source: 'manual-admin-create',
        },
      });
    }

    await prisma.adminAssetAction.create({
      data: {
        assetId: created.id,
        actorProfileId: actor.id,
        action: 'CREATE_ASSET',
        metadata: { symbol: created.symbol },
      },
    });

    return ok({ asset: created });
  } catch (error) {
    return fromCaughtError(error);
  }
}
