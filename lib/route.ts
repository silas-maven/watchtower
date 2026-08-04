import { fail } from '@/lib/api';
import { hit, type RateLimitBucket } from '@/lib/rateLimit';

/**
 * Count this request against a rate-limit bucket.
 *
 * Returns a 429 response to hand straight back when the caller is over budget,
 * or null to carry on. Written as a returned response rather than a thrown error
 * so the Retry-After header travels with it, which is what tells a well behaved
 * client when to come back instead of retrying immediately and making it worse.
 *
 *     const limited = enforceRateLimit('model', user.id);
 *     if (limited) return limited;
 */
export function enforceRateLimit(bucket: RateLimitBucket, identity: string) {
  const result = hit(bucket, identity);
  if (result.allowed) return null;
  return fail(
    'You are doing that too quickly. Wait a moment and try again.',
    429,
    'RATE_LIMITED',
    { 'Retry-After': String(result.retryAfterSeconds) },
  );
}

/**
 * The coded errors the auth and entitlement layers throw on purpose. These are
 * the ONLY messages that reach a client, because these are the only ones written
 * to be read by one.
 */
const HANDLED = {
  UNAUTHENTICATED: { message: 'Authentication required', status: 401 },
  FORBIDDEN: { message: 'Forbidden', status: 403 },
  ACCESS_SUSPENDED: { message: 'Access is paused or removed', status: 403 },
  PAYWALL: { message: 'This is a members feature. Upgrade to access it.', status: 402 },
} as const;

/**
 * Turn a thrown error into a response.
 *
 * ANYTHING NOT IN THE MAP ABOVE IS TREATED AS A BUG, NOT AS A MESSAGE.
 *
 * This used to end with `return fail(error.message, 400, 'REQUEST_FAILED')`,
 * which handed the raw text of any unexpected error straight to the caller. That
 * is a real disclosure: a Prisma failure names tables, columns and constraints,
 * a connection failure can carry the database host, and a parse failure can echo
 * back part of the payload. It also lied about the cause, reporting a server
 * fault as a 400 so genuine outages looked like client mistakes in the logs and
 * clients retried something that was never going to succeed.
 *
 * Unhandled errors now log in full on the server, where the detail belongs, and
 * return a generic 500. The one thing that does cross the boundary is a short
 * random reference, so a member can quote it and it can be found in the logs
 * without them ever having been shown the error itself.
 */
export function fromCaughtError(error: unknown) {
  if (error instanceof Error && error.message in HANDLED) {
    const { message, status } = HANDLED[error.message as keyof typeof HANDLED];
    return fail(message, status, error.message);
  }

  const reference = Math.random().toString(36).slice(2, 10);
  console.error(`[api] unhandled error ref=${reference}`, error);

  return fail(
    `Something went wrong on our side. Quote reference ${reference} if you contact support.`,
    500,
    'INTERNAL_ERROR',
  );
}
