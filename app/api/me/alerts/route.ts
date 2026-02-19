import { SignalState } from '@prisma/client';
import { ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { APP_TIMEZONE } from '@/lib/env';
import { startOfDayInTimeZone } from '@/lib/time';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ userId: user.id }, { role: user.role }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const watchIds = await prisma.personalWatch.findMany({
      where: { userId: user.id },
      select: { assetId: true },
    });
    const watchedAssetIds = new Set(watchIds.map((w) => w.assetId));

    const dayStart = startOfDayInTimeZone(new Date(), APP_TIMEZONE);
    const newSignals = await prisma.assetSnapshot.findMany({
      where: {
        capturedAt: { gte: dayStart },
        signalState: { in: [SignalState.BUY, SignalState.SELL, SignalState.BOTH] },
      },
      include: { asset: true },
      orderBy: { capturedAt: 'desc' },
      take: 100,
    });

    return ok({
      notifications,
      watchedSignals: newSignals.filter((s) => watchedAssetIds.has(s.assetId)),
      globalSignals: newSignals.filter((s) => !watchedAssetIds.has(s.assetId)),
    });
  } catch (error) {
    return fromCaughtError(error);
  }
}
