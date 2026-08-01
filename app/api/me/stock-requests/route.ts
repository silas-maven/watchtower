import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requirePaid } from '@/lib/entitlements';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { REQUEST_TYPES } from '@/lib/securityRequests';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const Schema = z.object({
  symbol: z.string().trim().min(1).max(20),
  assetType: z.enum(REQUEST_TYPES).default('STOCK'),
  name: z.string().trim().max(120).optional(),
  market: z.string().trim().max(60).optional(),
  note: z.string().trim().max(280).optional(),
});

/** The member's own requests, so they can see what happened to each one. */
export async function GET() {
  try {
    const user = await requirePaid();
    const requests = await prisma.stockRequest.findMany({
      where: { profileId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        symbol: true,
        assetType: true,
        name: true,
        market: true,
        note: true,
        status: true,
        adminNote: true,
        createdAt: true,
      },
    });
    return ok({ requests });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePaid();
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Enter a ticker symbol', 400, 'INVALID_PAYLOAD');

    const symbol = parsed.data.symbol.toUpperCase();

    // Already in the universe: tell them rather than queueing work that has
    // nothing to do. Matched on symbol, which is how the watchlist is keyed.
    const existing = await prisma.asset.findFirst({
      where: { symbol, isActive: true },
      select: { id: true, name: true },
    });
    if (existing) {
      return fail(`${symbol} is already on the watchlist as ${existing.name}.`, 409, 'ALREADY_TRACKED');
    }

    // Don't let one member stack up duplicates of their own open request.
    const open = await prisma.stockRequest.findFirst({
      where: { profileId: user.id, symbol, status: { in: ['PENDING', 'REVIEWED'] } },
      select: { id: true },
    });
    if (open) {
      return fail(`You have already asked for ${symbol}. It is still with the academy.`, 409, 'DUPLICATE_REQUEST');
    }

    const request = await prisma.stockRequest.create({
      data: {
        profileId: user.id,
        symbol,
        assetType: parsed.data.assetType,
        name: parsed.data.name || null,
        market: parsed.data.market || null,
        note: parsed.data.note || null,
      },
    });
    return ok({ request: { id: request.id, symbol: request.symbol, status: request.status } });
  } catch (error) {
    return fromCaughtError(error);
  }
}
