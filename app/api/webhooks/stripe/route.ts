import { Role, SubscriptionStatus } from '@prisma/client';
import { fail, ok } from '@/lib/api';
import { optionalEnv } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { applyAccessDecision, decideFromSubscriptionEvent } from '@/lib/subscriptions/access';

export const runtime = 'nodejs';

function mapStatus(stripeStatus?: string | null): SubscriptionStatus {
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') return SubscriptionStatus.OVERDUE;
  if (stripeStatus === 'canceled') return SubscriptionStatus.REMOVED;
  if (stripeStatus === 'paused') return SubscriptionStatus.PAUSED;
  return SubscriptionStatus.ACTIVE;
}

async function profileIdFromCustomer(customerId: string | null | undefined) {
  if (!customerId) return null;
  const row = await prisma.stripeCustomer.findUnique({ where: { stripeCustomerId: customerId } });
  return row?.profileId ?? null;
}

// checkout.session.completed is the first reliable moment we can bind a Stripe
// customer to a profile, because the session carries our metadata. Ensure the
// StripeCustomer link exists so later subscription/invoice events resolve.
async function profileIdFromMetadata(profileId: string | undefined, customerId: string | null) {
  if (!profileId) return null;
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) return null;
  if (customerId) {
    await prisma.stripeCustomer
      .upsert({
        where: { profileId },
        update: { stripeCustomerId: customerId },
        create: { profileId, stripeCustomerId: customerId },
      })
      .catch(() => undefined);
  }
  return profileId;
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = optionalEnv('STRIPE_WEBHOOK_SECRET');
  if (!stripe || !webhookSecret) return fail('Missing Stripe configuration', 500, 'MISSING_ENV');

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) return fail('Missing Stripe signature', 400, 'MISSING_SIGNATURE');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return fail('Invalid Stripe webhook signature', 400, 'INVALID_SIGNATURE');
  }

  if (await prisma.paymentEvent.findUnique({ where: { stripeEventId: event.id } })) return ok({ received: true, duplicate: true });

  const object = event.data.object as {
    id?: string;
    customer?: string;
    subscription?: string;
    amount_paid?: number;
    amount_due?: number;
    amount_total?: number;
    currency?: string;
    status?: string;
    mode?: string;
    current_period_end?: number;
    cancel_at_period_end?: boolean;
    metadata?: { profileId?: string; product?: string };
    lines?: { data?: Array<{ period?: { end?: number } }> };
  };
  const customerId = typeof object.customer === 'string' ? object.customer : null;
  const profileId = (await profileIdFromCustomer(customerId)) ?? (await profileIdFromMetadata(object.metadata?.profileId, customerId));

  await prisma.paymentEvent.create({
    data: {
      stripeEventId: event.id,
      stripeObjectId: object.id,
      type: event.type,
      profileId,
      amount: object.amount_paid ?? object.amount_due ?? null,
      currency: object.currency ?? null,
      status: object.status ?? null,
      payload: event as never,
    },
  });

  if (profileId && event.type === 'invoice.payment_failed') {
    await prisma.subscriptionMirror.upsert({
      where: { profileId },
      update: { status: SubscriptionStatus.OVERDUE, lastPaymentFailedAt: new Date() },
      create: { profileId, status: SubscriptionStatus.OVERDUE, lastPaymentFailedAt: new Date() },
    });
    await prisma.billingAlert.create({
      data: {
        profileId,
        type: 'payment_failed',
        title: 'Payment failed',
        body: 'Stripe reported a failed payment. Admin review required; access was not changed automatically.',
        stripeEventId: event.id,
        metadata: { customerId, invoiceId: object.id },
      },
    });
  }

  // checkout.session.completed needs no handling of its own: membership is a
  // subscription and lands in the events below, and the customer link was made
  // above. The one-off eCourse branch that used to live here is gone with the
  // in-app eCourse checkout, which moved to Whop.

  if (profileId && (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created' || event.type === 'customer.subscription.deleted')) {
    // For subscription events the object is the subscription itself.
    const periodEnd = object.current_period_end ?? object.lines?.data?.[0]?.period?.end;
    await prisma.subscriptionMirror.upsert({
      where: { profileId },
      update: {
        stripeSubscriptionId: object.id ?? undefined,
        stripeStatus: object.status ?? null,
        status: mapStatus(object.status),
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
      },
      create: {
        profileId,
        stripeSubscriptionId: object.id,
        stripeStatus: object.status ?? null,
        status: mapStatus(object.status),
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      },
    });

    // Access now follows the subscription automatically in BOTH directions
    // (owner's decision, 2026-08-02). A live subscription grants the paid tier;
    // a finished one withdraws it. A subscription merely set to cancel at the
    // period end still reads as active, so it keeps access until Stripe ends it.
    // See lib/subscriptions/access.ts for what "withdraw" does and does not do.
    await applyAccessDecision(
      profileId,
      decideFromSubscriptionEvent({
        eventType: event.type,
        status: object.status,
        cancelAtPeriodEnd: object.cancel_at_period_end,
      }),
      `Stripe reported subscription status "${object.status ?? event.type}".`,
    ).catch(() => undefined);

    const endedNow =
      event.type === 'customer.subscription.deleted' ||
      object.status === 'canceled' ||
      object.status === 'unpaid' ||
      object.cancel_at_period_end === true;
    if (endedNow) {
      const cancelsAtEnd = object.cancel_at_period_end === true && event.type !== 'customer.subscription.deleted';
      await prisma.billingAlert.create({
        data: {
          profileId,
          type: 'subscription_ended',
          title: cancelsAtEnd ? 'Subscription set to cancel' : 'Subscription ended',
          body: cancelsAtEnd
            ? 'Stripe reports this subscription will not renew. Access is unchanged and stays that way until the period actually ends.'
            : 'Stripe reports this subscription has ended, so the paid tier was withdrawn automatically. The member can still sign in and pay again; reinstate from the Members page to give it back sooner.',
          stripeEventId: event.id,
          metadata: { customerId, subscriptionId: object.id, stripeStatus: object.status ?? null },
        },
      }).catch(() => undefined);
    }
  }

  if (profileId && event.type === 'invoice.payment_succeeded') {
    await prisma.subscriptionMirror.upsert({
      where: { profileId },
      update: { status: SubscriptionStatus.ACTIVE, lastPaidAt: new Date(), lastPaymentFailedAt: null },
      create: { profileId, status: SubscriptionStatus.ACTIVE, lastPaidAt: new Date() },
    });
    // A paid invoice is the clearest signal of a paying member, and it is what
    // reinstates somebody the overdue sweep had already moved to the free tier.
    await applyAccessDecision(profileId, 'GRANT', 'Stripe reported a successful payment.').catch(() => undefined);
    await prisma.billingAlert.updateMany({ where: { profileId, status: 'OPEN' }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
  }

  return ok({ received: true });
}
