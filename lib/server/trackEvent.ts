import { prisma } from '@/lib/prisma';
import type { UsageEventType, Prisma } from '@prisma/client';

/**
 * Lightweight, fire-and-forget usage event logger.
 * Never throws — failures are silently swallowed so tracking
 * never blocks real user flows.
 */
export function trackEvent(
  profileId: string | null | undefined,
  type: UsageEventType,
  metadata?: Record<string, unknown>,
  path?: string,
) {
  if (!profileId) return;
  prisma.usageEvent
    .create({
      data: {
        profileId,
        type,
        path: path ?? null,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    })
    .catch(() => null);
}
