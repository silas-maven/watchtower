import { ok } from '@/lib/api';
import { fromCaughtError } from '@/lib/route';
import { assertCronSecret } from '@/lib/security';
import { runOverdueCheck } from '@/lib/subscriptions/overdue';

export const runtime = 'nodejs';

async function run() {
  try {
    await assertCronSecret();
    const result = await runOverdueCheck();
    return ok({ result });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function POST() {
  return run();
}

export async function GET() {
  return run();
}
