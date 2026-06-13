export type NewsFeed = { name: string; url: string };

// Free finance/markets RSS feeds, verified reachable + parseable. Admins can
// override this set via the `news_feed_urls` platform setting.
export const DEFAULT_NEWS_FEEDS: NewsFeed[] = [
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
  { name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
];

export const DEFAULT_X_HANDLE = 'MarketWatch';

export function hostnameToName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Source';
  }
}
