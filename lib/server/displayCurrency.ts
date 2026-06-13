import { prisma } from '@/lib/prisma';
import { fetchFxRates } from '@/lib/market/fx';
import { convertFromGbp, normaliseDisplayCurrency, type DisplayCurrency } from '@/lib/money';

export type DisplayContext = {
  currency: DisplayCurrency;
  // Multiplier to convert a GBP amount into the display currency: gbp * gbpRate.
  gbpRate: number;
};

/**
 * Resolves a member's display currency and the GBP -> display multiplier. The
 * app computes everything in GBP; this lets surfaces present those values in the
 * member's chosen base currency without re-plumbing the maths.
 */
export async function getDisplayContext(profileId: string): Promise<DisplayContext> {
  const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { baseCurrency: true } });
  const currency = normaliseDisplayCurrency(profile?.baseCurrency);
  if (currency === 'GBP') return { currency, gbpRate: 1 };

  const fx = await fetchFxRates();
  const gbpRate = convertFromGbp(1, currency, fx) ?? 1;
  return { currency, gbpRate };
}
