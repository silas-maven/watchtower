import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const Schema = z.object({
  symbol: z.string().trim().min(1).max(20),
  note: z.string().trim().max(280).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Enter a ticker symbol', 400, 'INVALID_PAYLOAD');

    const request = await prisma.stockRequest.create({
      data: { profileId: user.id, symbol: parsed.data.symbol.toUpperCase(), note: parsed.data.note || null },
    });
    return ok({ request: { id: request.id, symbol: request.symbol, status: request.status } });
  } catch (error) {
    return fromCaughtError(error);
  }
}
