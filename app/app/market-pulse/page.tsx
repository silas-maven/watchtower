import { BlurFade } from '@/components/ui/blur-fade';
import { requirePageUser } from '@/lib/server/pageAuth';
import { getSettings } from '@/lib/server/settings';
import { getMacroTiles, weatherInputsFromTiles } from '@/lib/market/macro';
import { SNAPSHOT_ROWS } from '@/lib/market/macroTypes';
import { classifyWeather } from '@/lib/market/weather';
import { WeatherSnapshotBoard } from '@/components/market/WeatherSnapshotBoard';
import { NewsFeedCard } from '@/components/news/NewsFeedCard';
import { XTimelineCard } from '@/components/news/XTimelineCard';
import { trackEvent } from '@/lib/server/trackEvent';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

/**
 * The full Market Pulse surface.
 *
 * The Dashboard now carries a three-article preview with a "View more" action
 * that lands here (owner's 4 August direction), so this is where the whole feed,
 * the curated X timeline and the full macro board live.
 *
 * Free to read. It is market news and public macro data, not the academy's call
 * on anything, so it sits on the same side of the line as the Asset Centre.
 */
export default async function MarketPulsePage() {
  const profile = await requirePageUser('/app/market-pulse');

  const [settings, macroTiles] = await Promise.all([
    getSettings().catch(() => null),
    getMacroTiles().catch(() => new Map()),
  ]);

  const weather = classifyWeather(weatherInputsFromTiles(macroTiles));
  const macroTileRecord = Object.fromEntries(macroTiles);

  trackEvent(profile.id, 'PAGE_VIEW', undefined, '/app/market-pulse');

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.05}>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Market Pulse</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">What the market is doing</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Headlines, the macro board and the voices worth following, in one place. Prices are delayed by up to 15
            minutes. Nothing here is the academy&rsquo;s view on any asset.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.1}>
        <WeatherSnapshotBoard weather={weather} tiles={macroTileRecord} rows={SNAPSHOT_ROWS} />
      </BlurFade>

      <BlurFade delay={0.15}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <NewsFeedCard />
          <XTimelineCard
            handle={settings?.news_x_handle || 'StockTwits'}
            listUrl={settings?.news_x_list_url || ''}
          />
        </div>
      </BlurFade>
    </div>
  );
}
