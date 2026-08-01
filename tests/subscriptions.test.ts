import { describe, expect, it } from 'vitest';
import { computeOverdueStage } from '@/lib/subscriptions/overdue';
import {
  REVOKE_AT_OVERDUE_STAGE,
  decideFromOverdueStage,
  decideFromSubscriptionEvent,
} from '@/lib/subscriptions/access';

describe('computeOverdueStage', () => {
  const now = new Date('2026-02-19T12:00:00.000Z');

  it('returns 0 when not overdue', () => {
    expect(computeOverdueStage(new Date('2026-02-19T00:00:00.000Z'), now)).toBe(0);
  });

  it('returns stage 1 at D+1', () => {
    expect(computeOverdueStage(new Date('2026-02-18T00:00:00.000Z'), now)).toBe(1);
  });

  it('returns stage 2 at D+3', () => {
    expect(computeOverdueStage(new Date('2026-02-16T00:00:00.000Z'), now)).toBe(2);
  });

  it('returns stage 3 for long overdue', () => {
    expect(computeOverdueStage(new Date('2026-02-01T00:00:00.000Z'), now)).toBe(3);
  });
});

describe('decideFromSubscriptionEvent', () => {
  it('grants on a live subscription', () => {
    expect(decideFromSubscriptionEvent({ eventType: 'customer.subscription.updated', status: 'active' })).toBe('GRANT');
    expect(decideFromSubscriptionEvent({ eventType: 'customer.subscription.created', status: 'trialing' })).toBe('GRANT');
  });

  it('revokes when the subscription is finished', () => {
    expect(decideFromSubscriptionEvent({ eventType: 'customer.subscription.deleted', status: 'canceled' })).toBe('REVOKE');
    expect(decideFromSubscriptionEvent({ eventType: 'customer.subscription.updated', status: 'unpaid' })).toBe('REVOKE');
    expect(decideFromSubscriptionEvent({ eventType: 'customer.subscription.updated', status: 'incomplete_expired' })).toBe('REVOKE');
  });

  it('holds while Stripe is still retrying a late payment', () => {
    // The whole point of the delay: past_due means the card may yet go through,
    // and cutting access on the first failure punishes a recoverable payment.
    expect(decideFromSubscriptionEvent({ eventType: 'customer.subscription.updated', status: 'past_due' })).toBe('HOLD');
    expect(decideFromSubscriptionEvent({ eventType: 'customer.subscription.updated', status: 'incomplete' })).toBe('HOLD');
  });

  it('keeps access for a subscription merely set to cancel at the period end', () => {
    // They have paid through to the end of the period, so nothing is withdrawn
    // until Stripe actually ends it and sends the deleted event.
    expect(
      decideFromSubscriptionEvent({ eventType: 'customer.subscription.updated', status: 'active', cancelAtPeriodEnd: true }),
    ).toBe('GRANT');
  });

  it('is not confused by capitalisation or a missing status', () => {
    expect(decideFromSubscriptionEvent({ eventType: 'customer.subscription.updated', status: 'ACTIVE' })).toBe('GRANT');
    expect(decideFromSubscriptionEvent({ eventType: 'customer.subscription.updated', status: null })).toBe('HOLD');
  });
});

describe('decideFromOverdueStage', () => {
  it('holds through the early stages and revokes at the threshold', () => {
    expect(decideFromOverdueStage(0)).toBe('HOLD');
    expect(decideFromOverdueStage(1)).toBe('HOLD');
    expect(decideFromOverdueStage(2)).toBe('HOLD');
    expect(decideFromOverdueStage(REVOKE_AT_OVERDUE_STAGE)).toBe('REVOKE');
  });

  it('withdraws access only after Stripe has had time to retry', () => {
    // Stage 3 starts at 10 days past due. Anything sooner would land inside the
    // window where most failed cards still recover.
    const due = new Date('2026-02-01T00:00:00.000Z');
    const dayNine = new Date('2026-02-10T00:00:00.000Z');
    const dayTen = new Date('2026-02-11T00:00:00.000Z');
    expect(decideFromOverdueStage(computeOverdueStage(due, dayNine))).toBe('HOLD');
    expect(decideFromOverdueStage(computeOverdueStage(due, dayTen))).toBe('REVOKE');
  });
});
