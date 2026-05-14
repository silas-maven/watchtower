import Stripe from 'stripe';
import { optionalEnv } from '@/lib/env';

export function getStripe() {
  const secretKey = optionalEnv('STRIPE_SECRET_KEY');
  if (!secretKey) return null;
  return new Stripe(secretKey);
}
