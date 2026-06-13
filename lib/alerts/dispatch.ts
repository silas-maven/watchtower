// SCAFFOLD ONLY. Not live. Gated behind the `alert_delivery_enabled` platform
// setting, which defaults to false. Until a deliberate decision is made to turn
// this on, dispatchSignalAlerts() returns immediately and sends nothing. The
// external channel functions are intentionally stubs.

import type { SignalState } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSetting } from '@/lib/server/settings';

export type SignalAlert = {
  assetId: string;
  symbol: string;
  toState: SignalState;
  price: number | null;
};

type ChannelResult = { channel: string; delivered: boolean; detail: string };

// --- External channel stubs (no real network calls) ---------------------------

async function sendEmailStub(): Promise<ChannelResult> {
  return { channel: 'email', delivered: false, detail: 'stub: email channel not wired' };
}

async function sendTelegramStub(): Promise<ChannelResult> {
  return { channel: 'telegram', delivered: false, detail: 'stub: telegram channel not wired' };
}

async function sendDiscordStub(): Promise<ChannelResult> {
  return { channel: 'discord', delivered: false, detail: 'stub: discord channel not wired' };
}

// --- Dispatcher ---------------------------------------------------------------

/**
 * Fan out signal alerts. Inert by default: with the flag off this is a no-op.
 * When enabled it writes in-app Notification rows for members tracking the asset
 * and calls the channel stubs. No external delivery happens until the stubs are
 * replaced with real integrations.
 */
export async function dispatchSignalAlerts(alerts: SignalAlert[]): Promise<void> {
  if (alerts.length === 0) return;

  const enabled = await getSetting('alert_delivery_enabled');
  if (!enabled) return;

  for (const alert of alerts) {
    const watchers = await prisma.userWatchlistItem.findMany({
      where: { assetId: alert.assetId },
      select: { watchlist: { select: { profileId: true } } },
      distinct: ['watchlistId'],
    });
    const profileIds = [...new Set(watchers.map((w) => w.watchlist.profileId))];

    if (profileIds.length > 0) {
      await prisma.notification.createMany({
        data: profileIds.map((profileId) => ({
          profileId,
          type: 'signal_alert',
          title: `${alert.symbol} is now ${alert.toState}`,
          body: `${alert.symbol} entered a ${alert.toState} signal${alert.price != null ? ` at ${alert.price}` : ''}.`,
          metadata: { assetId: alert.assetId, toState: alert.toState },
        })),
      }).catch(() => undefined);
    }

    await Promise.allSettled([sendEmailStub(), sendTelegramStub(), sendDiscordStub()]);
  }
}
