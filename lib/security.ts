import { headers } from 'next/headers';

export async function assertCronSecret(): Promise<void> {
  const h = await headers();
  const auth = h.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
  const direct = h.get('x-cron-secret') ?? undefined;
  const expected = process.env.CRON_SECRET;
  if (!expected || (bearer !== expected && direct !== expected)) {
    throw new Error('FORBIDDEN');
  }
}
