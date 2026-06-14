import { requirePageUser } from '@/lib/server/pageAuth';
import { ensureFreshMarketData } from '@/lib/server/marketFreshness';
import { getWatchlistsPageData } from '@/lib/server/watchlists';
import { WatchlistsClient } from '@/components/watchlists/WatchlistsClient';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export default async function WatchlistsPage() {
  const profile = await requirePageUser('/app/watchlists');
  await ensureFreshMarketData();

  const { assets, lists } = await getWatchlistsPageData(profile.id);

  return <WatchlistsClient initialAssets={assets} initialLists={lists} />;
}
