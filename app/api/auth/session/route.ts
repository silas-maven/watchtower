import { ok } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

export async function GET() {
  const user = await getSessionUser();
  return ok({ user });
}
