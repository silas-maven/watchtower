import { fail } from '@/lib/api';

export async function POST() {
  return fail('Logout is handled by Clerk UserButton.', 410, 'CLERK_AUTH_REQUIRED');
}
