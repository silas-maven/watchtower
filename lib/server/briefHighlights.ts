import { SignalState } from '@prisma/client';
import { APP_TIMEZONE } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { computeSignalState, effectiveSignalState, isBuyLike, isSellLike } from '@/lib/signals/engine';
import { startOfDayInTimeZone } from '@/lib/time';

// Daily-brief additions from the 2026-07-24 feedback (section 6).
//
// SESSION BOUNDARY (the doc asks for this to be defined explicitly):
// "since yesterday" means since 00:00 in APP_TIMEZONE (Europe/London by default)
// on the previous calendar day, i.e. everything that has happened since the
// previous morning's brief was written. One boundary is used for every asset
// regardless of its home exchange, so a single brief cannot mix session
// definitions. Crypto trades continuously and is included on the same boundary.
//
// NOT IMPLEMENTED ON PURPOSE (see `unavailable` below): dividend ex-dates,
// rights-issue ex-dates and all-time lows. The feedback explicitly says not to
// claim a corporate action or an all-time low when provider coverage is
// incomplete, and ours is: Yahoo gives dividend dates unevenly, effectively no
// rights-issue data, and we hold only as much history as has been fetched, so an
// "all-time low" would really mean "lowest we have seen". They are reported as
// unavailable rather than guessed at.

export type BriefAssetRef = { symbol: string; name: string };

export type ExtremeRangeRow = BriefAssetRef & {
  rangePct: number;
  high: number;
  low: number;
  previousClose: number;
};

export type EarningsRow = BriefAssetRef & { date: string };

export type BriefHighlights = {
  /** Signals that newly triggered since the previous brief. */
  newBuy: BriefAssetRef[];
  newSell: BriefAssetRef[];
  /** In signal now, but not newly triggered: carried over from before. */
  stillActiveBuy: BriefAssetRef[];
  stillActiveSell: BriefAssetRef[];
  /** Prior-day intraday range wider than 40% of the previous close. */
  extremeRange: ExtremeRangeRow[];
  /** Reporting earnings in the next EARNINGS_WINDOW_DAYS days, from today. */
  earningsThisWeek: EarningsRow[];
  /** Requested but not derivable from current data; never fabricated. */
  unavailable: string[];
  since: string;
  timezone: string;
};

/** Threshold from the feedback: (high - low) / previous close x 100. */
export const EXTREME_RANGE_PCT = 40;

/** How far ahead "reporting earnings" looks. Forward only, never backwards. */
export const EARNINGS_WINDOW_DAYS = 7;

// Upper sanity bound. Delisted and sub-penny names come back from the provider
// with meaningless prices (a previous close of 3.9e-14 produced a "553,400,848%
// range"), so anything past this is treated as bad data and dropped rather than
// printed at a member. A real security does not move this much in a session.
const MAX_PLAUSIBLE_RANGE_PCT = 300;
// Prices below this are provider noise rather than a tradeable quote.
const MIN_PLAUSIBLE_PRICE = 1e-6;
// A daily low under this fraction of the previous close is a bad tick, not a
// real move: the provider occasionally reports a near-zero low on a name that
// closed flat (e.g. a low of 1.86 against a previous close of 1,918).
const MIN_LOW_VS_PREV_CLOSE = 0.1;

export const UNAVAILABLE_REASONS = [
  'Dividend ex-dates: no dependable feed on the current data provider.',
  'Rights-issue ex-dates: no dependable feed on the current data provider.',
  'All-time lows: needs complete adjusted history, so only "lowest on record here" is knowable today.',
];

/**
 * The forward window for "reporting earnings": from the start of today in the
 * app timezone, to EARNINGS_WINDOW_DAYS later. Exported so it can be tested
 * without a database, and so the "never look backwards" property is provable
 * rather than asserted in a comment.
 */
export function earningsWindow(forDate: Date, timeZone: string): { from: Date; to: Date } {
  const from = startOfDayInTimeZone(forDate, timeZone);
  return { from, to: new Date(from.getTime() + EARNINGS_WINDOW_DAYS * 24 * 60 * 60 * 1000) };
}

function ref(asset: { symbol: string; name: string }): BriefAssetRef {
  return { symbol: asset.symbol, name: asset.name };
}

function bySymbol(a: BriefAssetRef, b: BriefAssetRef) {
  return a.symbol.localeCompare(b.symbol);
}

/**
 * Compute the brief additions. Pass `assetIds` to scope it to one member's
 * tracked assets; omit for the academy-wide brief.
 */
export async function getBriefHighlights(
  forDate = new Date(),
  assetIds?: string[],
): Promise<BriefHighlights> {
  // Everything since 00:00 (app timezone) yesterday, i.e. since the last brief.
  const todayStart = startOfDayInTimeZone(forDate, APP_TIMEZONE);
  const since = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  // Earnings are a FORWARD window: today, plus the next seven days.
  //
  // This used to run from the most recent Monday, which meant a brief read on a
  // Sunday listed the earnings of the Monday and Tuesday just gone. The
  // 2 August brief showed 27 and 28 July, both already reported. "Reporting
  // this week" only ever means something a member can still act on, so the
  // window now starts today and never looks backwards.
  const { from: earningsFrom, to: earningsTo } = earningsWindow(forDate, APP_TIMEZONE);

  const scope = assetIds ? { id: { in: assetIds } } : {};

  const [assets, events] = await Promise.all([
    // Only the fields this function reads. The full include pulled every column
    // of both tables for all 815 assets to compute four short lists.
    prisma.asset.findMany({
      where: { isActive: true, isMacro: false, ...scope },
      select: {
        symbol: true,
        name: true,
        closeYest: true,
        nextEarningsDate: true,
        rule: { select: { targetEntry: true, targetExit: true, signalOverride: true } },
        snapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 1,
          select: { dailyLow: true, dailyHigh: true, closeYest: true },
        },
      },
    }),
    prisma.signalEvent.findMany({
      where: { occurredAt: { gte: since }, ...(assetIds ? { assetId: { in: assetIds } } : {}) },
      include: { asset: { select: { symbol: true, name: true } } },
      orderBy: { occurredAt: 'desc' },
    }),
  ]);

  // Newly triggered since the boundary, split by direction.
  const newBuySymbols = new Set<string>();
  const newSellSymbols = new Set<string>();
  const newBuy: BriefAssetRef[] = [];
  const newSell: BriefAssetRef[] = [];
  for (const event of events) {
    const entered = event.toState;
    if (entered === SignalState.NONE) continue;
    if (isBuyLike(entered) && !isBuyLike(event.fromState) && !newBuySymbols.has(event.asset.symbol)) {
      newBuySymbols.add(event.asset.symbol);
      newBuy.push(ref(event.asset));
    }
    if (isSellLike(entered) && !isSellLike(event.fromState) && !newSellSymbols.has(event.asset.symbol)) {
      newSellSymbols.add(event.asset.symbol);
      newSell.push(ref(event.asset));
    }
  }

  const stillActiveBuy: BriefAssetRef[] = [];
  const stillActiveSell: BriefAssetRef[] = [];
  const extremeRange: ExtremeRangeRow[] = [];
  const earningsThisWeek: EarningsRow[] = [];

  for (const asset of assets) {
    const snap = asset.snapshots[0];
    const state = effectiveSignalState(
      computeSignalState({
        dailyLow: snap?.dailyLow ?? null,
        dailyHigh: snap?.dailyHigh ?? null,
        targetEntry: asset.rule?.targetEntry ?? null,
        targetExit: asset.rule?.targetExit ?? null,
      }),
      asset.rule?.signalOverride,
    );

    // Active but not newly triggered = carried over from a previous session.
    if (isBuyLike(state) && !newBuySymbols.has(asset.symbol)) stillActiveBuy.push(ref(asset));
    if (isSellLike(state) && !newSellSymbols.has(asset.symbol)) stillActiveSell.push(ref(asset));

    const high = snap?.dailyHigh ?? null;
    const low = snap?.dailyLow ?? null;
    const prevClose = snap?.closeYest ?? asset.closeYest ?? null;
    if (
      high != null &&
      low != null &&
      prevClose != null &&
      high >= low &&
      // Reject provider noise before dividing by it.
      prevClose >= MIN_PLAUSIBLE_PRICE &&
      low >= MIN_PLAUSIBLE_PRICE &&
      low >= prevClose * MIN_LOW_VS_PREV_CLOSE
    ) {
      const rangePct = ((high - low) / prevClose) * 100;
      if (rangePct > EXTREME_RANGE_PCT && rangePct <= MAX_PLAUSIBLE_RANGE_PCT) {
        extremeRange.push({ ...ref(asset), rangePct, high, low, previousClose: prevClose });
      }
    }

    const earnings = asset.nextEarningsDate;
    if (earnings && earnings >= earningsFrom && earnings < earningsTo) {
      earningsThisWeek.push({ ...ref(asset), date: earnings.toISOString().slice(0, 10) });
    }
  }

  return {
    newBuy: newBuy.sort(bySymbol),
    newSell: newSell.sort(bySymbol),
    stillActiveBuy: stillActiveBuy.sort(bySymbol),
    stillActiveSell: stillActiveSell.sort(bySymbol),
    extremeRange: extremeRange.sort((a, b) => b.rangePct - a.rangePct),
    earningsThisWeek: earningsThisWeek.sort((a, b) => a.date.localeCompare(b.date) || bySymbol(a, b)),
    unavailable: UNAVAILABLE_REASONS,
    since: since.toISOString(),
    timezone: APP_TIMEZONE,
  };
}
