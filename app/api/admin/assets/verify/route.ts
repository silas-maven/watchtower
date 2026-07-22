import { Role } from '@prisma/client';
import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';
import { fetchYahooQuotes } from '@/lib/market/yahoo';
import { fetchCryptoQuote } from '@/lib/market/crypto';
import { toQuoteSymbol } from '@/lib/market/symbols';

export const runtime = 'nodejs';
export const maxDuration = 30;

const Schema = z.object({
  symbol: z.string().min(1).max(24),
  quoteSymbol: z.string().max(24).nullable().optional(),
  assetType: z.string().optional(),
  currency: z.string().optional(),
});

/**
 * Resolves a ticker to a live quote so the owner can confirm a symbol before it
 * joins the master list. Returns the name, price and trading currency Yahoo
 * reports, which is the same path the refresh job uses.
 */
export async function POST(req: Request) {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const quoteSymbol = toQuoteSymbol({
      symbol: parsed.data.symbol,
      quoteSymbol: parsed.data.quoteSymbol ?? null,
      assetType: parsed.data.assetType ?? null,
      currency: parsed.data.currency ?? null,
    });

    const quotes = await fetchYahooQuotes([quoteSymbol]);
    let quote = quotes.get(quoteSymbol.toUpperCase());

    if (!quote && parsed.data.assetType === 'CRYPTO') {
      const cg = await fetchCryptoQuote(parsed.data.symbol);
      if (cg) quote = { ...cg, quoteCurrency: 'USD', nextEarningsDate: null, ma50: null, ma200: null, dividendYield: null };
    }

    if (!quote || quote.currentPrice == null) {
      return ok({ resolved: false, quoteSymbol });
    }

    return ok({
      resolved: true,
      quoteSymbol,
      currency: quote.quoteCurrency,
      currentPrice: quote.currentPrice,
      dailyHigh: quote.dailyHigh,
      dailyLow: quote.dailyLow,
      low52: quote.low52,
      high52: quote.high52,
    });
  } catch (error) {
    return fromCaughtError(error);
  }
}
