import { requirePageUser } from '@/lib/server/pageAuth';
import { canUse } from '@/lib/entitlements';
import { ensureFreshMarketData } from '@/lib/server/marketFreshness';
import { getWatchlistsPageData } from '@/lib/server/watchlists';
import { WatchlistsClient } from '@/components/watchlists/WatchlistsClient';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export default async function WatchlistsPage() {
  const profile = await requirePageUser('/app/watchlists');
  // The master watchlist is open to everyone: the academy treats it as lead
  // generation, and a list of tickers nobody can act on is an advert for the
  // membership. What stays behind the paywall is the academy's call on each one
  // (the signal and its price targets) and the tools built on top of the list.
  const paid = canUse(profile, 'signals');
  ensureFreshMarketData();

  const { assets, lists } = await getWatchlistsPageData(profile.id, { includeSignals: paid });

  return <WatchlistsClient initialAssets={assets} initialLists={lists} paid={paid} />;
}
