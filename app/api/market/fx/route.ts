import { ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';
import { fetchFxRates } from '@/lib/market/fx';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

// Member-readable FX rates so the Average Planner can preview share counts
// (GBP budget -> asset currency) client-side with the same maths as the server.
export async function GET() {
  try {
    await requireUser();
    return ok({ fx: await fetchFxRates() });
  } catch (error) {
    return fromCaughtError(error);
  }
}
