import { ok } from '@/lib/api';
import { refreshMarketData } from '@/lib/jobs/refreshMarket';
import { fromCaughtError } from '@/lib/route';
import { assertCronSecret } from '@/lib/security';

export const runtime = 'nodejs';
export const maxDuration = 300;

async function run() {
  try {
    await assertCronSecret();
    const result = await refreshMarketData();
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
