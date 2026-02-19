import { ok } from '@/lib/api';
import { clearSessionCookie, destroySession, getSessionToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  const token = await getSessionToken();
  await destroySession(token);
  await clearSessionCookie();
  return ok({ loggedOut: true });
}
