import { requirePageUser } from '@/lib/server/pageAuth';
import { isPaidUser } from '@/lib/entitlements';
import { ensureFreshMarketData } from '@/lib/server/marketFreshness';
import { getWatchlistsPageData } from '@/lib/server/watchlists';
import { WatchlistsClient } from '@/components/watchlists/WatchlistsClient';
import { Paywall } from '@/components/Paywall';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export default async function WatchlistsPage() {
  const profile = await requirePageUser('/app/watchlists');
  // The curated master watchlist (the academy's own picks) is the crown jewel of
  // the membership. Free-tier profiles get the upgrade gate instead.
  if (!isPaidUser(profile)) {
    return (
      <Paywall
        title="The master watchlist is a members feature"
        message="The academy's curated master watchlist and your personal sublists are part of the paid membership."
      />
    );
  }
  await ensureFreshMarketData();

  const { assets, lists } = await getWatchlistsPageData(profile.id);

  return <WatchlistsClient initialAssets={assets} initialLists={lists} />;
}
