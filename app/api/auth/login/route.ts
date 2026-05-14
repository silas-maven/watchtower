import { fail } from '@/lib/api';

export async function POST() {
  return fail('Password login has been replaced by Clerk. Use /sign-in.', 410, 'CLERK_AUTH_REQUIRED');
}
