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
    await requireRole([Role.OWNER, Role.ADMIN]);

    const body = await req.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const input = parsed.data;
    const symbol = input.symbol.trim().toUpperCase();

    const existing = await prisma.asset.findUnique({ where: { symbol } });
    if (existing) return fail('Asset symbol already exists', 409, 'SYMBOL_EXISTS');

    const created = await prisma.asset.create({
      data: {
        symbol,
        name: input.name.trim(),
        reason: input.reason?.trim() || null,
        assetType: input.assetType,
        currency: input.currency.trim().toUpperCase(),
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

    return ok({ asset: created });
  } catch (error) {
    return fromCaughtError(error);
  }
}
