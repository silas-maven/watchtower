import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        rule: true,
        snapshots: { orderBy: { capturedAt: 'desc' }, take: 30 },
      },
    });

    if (!asset) return fail('Asset not found', 404, 'NOT_FOUND');

    return ok({
      asset: {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        reason: asset.reason,
        assetType: asset.assetType,
        currency: asset.currency,
        brokerEntryPrice: asset.brokerEntryPrice,
        averageEntryPrice: asset.averageEntryPrice,
        shares: asset.shares,
        targetEntry: asset.rule?.targetEntry ?? null,
        targetExit: asset.rule?.targetExit ?? null,
        snapshots: asset.snapshots,
        stats: {
          beta: asset.beta,
          low52: asset.low52,
          high52: asset.high52,
          pe: asset.pe,
          volumeAvg: asset.volumeAvg,
          marketCap: asset.marketCap,
        },
      },
    });
  } catch (error) {
    return fromCaughtError(error);
  }
}
