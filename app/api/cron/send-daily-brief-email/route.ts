import { ok } from '@/lib/api';
import { sendDailyBriefEmails } from '@/lib/jobs/sendDailyBriefEmail';
import { fromCaughtError } from '@/lib/route';
import { assertCronSecret } from '@/lib/security';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Runs after the daily brief is generated, so the email reflects that morning's
// brief. Safe to run twice: sends are keyed one-per-member-per-day.
async function run() {
  try {
    await assertCronSecret();
    const result = await sendDailyBriefEmails();
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
