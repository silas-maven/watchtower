import { fail } from '@/lib/api';

export function fromCaughtError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'UNAUTHENTICATED') return fail('Authentication required', 401, 'UNAUTHENTICATED');
    if (error.message === 'FORBIDDEN') return fail('Forbidden', 403, 'FORBIDDEN');
    if (error.message === 'ACCESS_SUSPENDED') return fail('Access is paused or removed', 403, 'ACCESS_SUSPENDED');
    if (error.message === 'PAYWALL') return fail('This is a members feature. Upgrade to access it.', 402, 'PAYWALL');
    return fail(error.message, 400, 'REQUEST_FAILED');
  }
  return fail('Unknown error', 500, 'UNKNOWN_ERROR');
}
