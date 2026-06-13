import { ok } from '@/lib/api';
import { persistWeeklyDigest } from '@/lib/ai/weeklyDigest';
import { fromCaughtError } from '@/lib/route';
import { assertCronSecret } from '@/lib/security';

export const runtime = 'nodejs';
export const maxDuration = 300;

async function run() {
  try {
    await assertCronSecret();
    const digest = await persistWeeklyDigest();
    return ok({ digest });
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
