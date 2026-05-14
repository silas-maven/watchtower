import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { optionalEnv } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const stripe = getStripe();
    const priceId = optionalEnv('STRIPE_PRICE_ID');
    if (!stripe || !priceId) return fail('Stripe checkout is not configured yet', 503, 'STRIPE_NOT_CONFIGURED');

    const origin = new URL(req.url).origin;
    const existing = await prisma.stripeCustomer.findUnique({ where: { profileId: user.id } });
    const customerId = existing?.stripeCustomerId ?? (await stripe.customers.create({ email: user.email, name: user.name, metadata: { profileId: user.id } })).id;
    if (!existing) await prisma.stripeCustomer.create({ data: { profileId: user.id, stripeCustomerId: customerId } });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app/account?checkout=success`,
      cancel_url: `${origin}/app/account?checkout=cancelled`,
      metadata: { profileId: user.id },
    });

    return ok({ url: session.url });
  } catch (error) {
    return fromCaughtError(error);
  }
}
