import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { trackEvent } from '@/lib/server/trackEvent';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    trackEvent(user.id, 'ASSET_VIEW', { assetId: id });

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        rule: true,
        snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
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
