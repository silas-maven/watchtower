import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { fetchYahooOhlc, type ChartInterval, type ChartRange } from '@/lib/market/yahoo';
import { toQuoteSymbol } from '@/lib/market/symbols';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const maxDuration = 20;

const RANGES = ['1mo', '3mo', '6mo', '1y', '2y', '5y'] as const;
const INTERVALS = ['1d', '1wk', '1mo'] as const;

// 200-period indicators need enough candles at the chosen interval; clamp the
// range up so weekly/monthly views can compute their MAs and Bollinger bands.
const MIN_RANGE_FOR_INTERVAL: Record<ChartInterval, ChartRange> = {
  '1d': '1y',
  '1wk': '5y',
  '1mo': '5y',
};

const RANGE_ORDER: ChartRange[] = ['1mo', '3mo', '6mo', '1y', '2y', '5y'];

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const search = new URL(req.url).searchParams;
    const rangeParam = search.get('range');
    const intervalParam = search.get('interval');
    const range: ChartRange = (RANGES as readonly string[]).includes(rangeParam ?? '') ? (rangeParam as ChartRange) : '3mo';
    const interval: ChartInterval = (INTERVALS as readonly string[]).includes(intervalParam ?? '')
      ? (intervalParam as ChartInterval)
      : '1d';

    // `full=1` requests enough history for 200-period indicators regardless of
    // the display range; the client slices what it shows.
    const wantFull = search.get('full') === '1';
    const fetchRange = wantFull
      ? RANGE_ORDER[Math.max(RANGE_ORDER.indexOf(range), RANGE_ORDER.indexOf(MIN_RANGE_FOR_INTERVAL[interval]))]
      : range;

    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { symbol: true, quoteSymbol: true, assetType: true, currency: true },
    });
    if (!asset) return fail('Asset not found', 404, 'NOT_FOUND');

    const quoteSymbol = toQuoteSymbol(asset);
    const points = await fetchYahooOhlc(quoteSymbol, fetchRange, interval);

    return ok({ range, interval, currency: asset.currency, points });
  } catch (error) {
    return fromCaughtError(error);
  }
}
