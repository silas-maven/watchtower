import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Opens the Stripe customer billing portal so a member can update their card,
 * view invoices, or cancel. Access state is never changed here; cancellation
 * flows back through the subscription webhook and is surfaced to the admin.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const stripe = getStripe();
    if (!stripe) return fail('Stripe is not configured yet', 503, 'STRIPE_NOT_CONFIGURED');

    const customer = await prisma.stripeCustomer.findUnique({ where: { profileId: user.id } });
    if (!customer) return fail('No billing account found. Start a membership first.', 404, 'NO_CUSTOMER');

    const origin = new URL(req.url).origin;
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: `${origin}/app/account`,
    });

    return ok({ url: session.url });
  } catch (error) {
    return fromCaughtError(error);
  }
}
