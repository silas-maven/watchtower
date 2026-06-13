import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { optionalEnv } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

const Schema = z.object({
  product: z.enum(['membership', 'ecourse']).default('membership'),
});

function priceForProduct(product: 'membership' | 'ecourse'): { priceId: string | undefined; mode: 'subscription' | 'payment' } {
  if (product === 'ecourse') {
    return { priceId: optionalEnv('STRIPE_ECOURSE_PRICE_ID'), mode: 'payment' };
  }
  // Membership: prefer the explicit membership price, fall back to the legacy STRIPE_PRICE_ID.
  return { priceId: optionalEnv('STRIPE_MEMBERSHIP_PRICE_ID') ?? optionalEnv('STRIPE_PRICE_ID'), mode: 'subscription' };
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const stripe = getStripe();
    if (!stripe) return fail('Stripe checkout is not configured yet', 503, 'STRIPE_NOT_CONFIGURED');

    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const { priceId, mode } = priceForProduct(parsed.data.product);
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
