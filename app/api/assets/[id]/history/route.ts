import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { fetchYahooChart } from '@/lib/market/yahoo';
import { toQuoteSymbol } from '@/lib/market/symbols';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const maxDuration = 20;

const RANGES = ['1mo', '3mo', '6mo', '1y'] as const;
type Range = (typeof RANGES)[number];

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const rangeParam = new URL(req.url).searchParams.get('range');
    const range: Range = (RANGES as readonly string[]).includes(rangeParam ?? '') ? (rangeParam as Range) : '3mo';

    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { symbol: true, quoteSymbol: true, assetType: true, currency: true },
    });
    if (!asset) return fail('Asset not found', 404, 'NOT_FOUND');

    const quoteSymbol = toQuoteSymbol(asset);
    const points = await fetchYahooChart(quoteSymbol, range);

    return ok({ range, currency: asset.currency, points });
  } catch (error) {
    return fromCaughtError(error);
  }
}
