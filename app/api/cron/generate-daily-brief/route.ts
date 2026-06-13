import { ok } from '@/lib/api';
import { persistDailyBrief } from '@/lib/ai/dailyBrief';
import { fromCaughtError } from '@/lib/route';
import { assertCronSecret } from '@/lib/security';

export const runtime = 'nodejs';
export const maxDuration = 300;

async function run() {
  try {
    await assertCronSecret();
    const brief = await persistDailyBrief();
    return ok({ brief });
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
