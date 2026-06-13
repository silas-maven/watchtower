import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { SUPPORTED_CURRENCIES } from '@/lib/money';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const Schema = z.object({
  baseCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { baseCurrency: true, declaredPortfolioGBP: true },
    });
    return ok({ baseCurrency: profile?.baseCurrency ?? 'GBP', declaredPortfolioGBP: profile?.declaredPortfolioGBP ?? null });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const updated = await prisma.profile.update({
      where: { id: user.id },
      data: { baseCurrency: parsed.data.baseCurrency },
      select: { baseCurrency: true },
    });
    return ok({ baseCurrency: updated.baseCurrency });
  } catch (error) {
    return fromCaughtError(error);
  }
}
