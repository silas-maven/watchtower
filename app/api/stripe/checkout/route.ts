import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { optionalEnv } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit, fromCaughtError } from '@/lib/route';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

// Membership is the only thing bought inside the app. The eCourse used to have a
// one-off Stripe price here as well, but it is sold on Whop now (see
// lib/academyOffers.ts) and two purchase routes for one product is how people
// end up paying twice. STRIPE_ECOURSE_PRICE_ID is no longer read anywhere.
const Schema = z.object({
  product: z.literal('membership').default('membership'),
});

function membershipPrice(): { priceId: string | undefined; mode: 'subscription' } {
  // Prefer the explicit membership price, fall back to the legacy STRIPE_PRICE_ID.
  return { priceId: optionalEnv('STRIPE_MEMBERSHIP_PRICE_ID') ?? optionalEnv('STRIPE_PRICE_ID'), mode: 'subscription' };
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    // Each call creates a Stripe Checkout Session. Bounded so this cannot be used to spam Stripe's API on our account.
    const limited = enforceRateLimit('billing', user.id);
    if (limited) return limited;

    const stripe = getStripe();
    if (!stripe) return fail('Stripe checkout is not configured yet', 503, 'STRIPE_NOT_CONFIGURED');

    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const { priceId, mode } = membershipPrice();
    if (!priceId) return fail('This product is not configured for checkout', 503, 'PRICE_NOT_CONFIGURED');

    const origin = new URL(req.url).origin;
    const existing = await prisma.stripeCustomer.findUnique({ where: { profileId: user.id } });
    const customerId =
      existing?.stripeCustomerId ??
      (await stripe.customers.create({ email: user.email, name: user.name, metadata: { profileId: user.id } })).id;
    if (!existing) await prisma.stripeCustomer.create({ data: { profileId: user.id, stripeCustomerId: customerId } });

    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app/account?checkout=success&product=${parsed.data.product}`,
      cancel_url: `${origin}/app/account?checkout=cancelled`,
      metadata: { profileId: user.id, product: parsed.data.product },
      ...(mode === 'subscription' ? { subscription_data: { metadata: { profileId: user.id } } } : {}),
    });

    return ok({ url: session.url });
  } catch (error) {
    return fromCaughtError(error);
  }
}
