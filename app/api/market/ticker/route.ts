import { ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';
import { getMacroTiles, SNAPSHOT_ROWS, TICKER_ORDER } from '@/lib/market/macro';
import { classifyWeather } from '@/lib/market/weather';
import { weatherInputsFromTiles } from '@/lib/market/macro';
import { ensureFreshMarketData } from '@/lib/server/marketFreshness';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const maxDuration = 30;

export async function GET() {
  try {
    await requireUser();
    await ensureFreshMarketData().catch(() => undefined);

    const tiles = await getMacroTiles();
    const weather = classifyWeather(weatherInputsFromTiles(tiles));

    return ok({
      tiles: Object.fromEntries(tiles),
      tickerOrder: TICKER_ORDER,
      snapshotRows: SNAPSHOT_ROWS,
      weather,
    });
  } catch (error) {
    return fromCaughtError(error);
  }
}
