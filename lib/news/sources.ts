export type NewsFeed = { name: string; url: string };

// Investing-focused RSS feeds, verified reachable + parseable (2026-07-24). These
// lean markets/investing rather than generic top-news, to match the academy's
// audience. Admins can override the whole set via the `news_feed_urls` setting.
export const DEFAULT_NEWS_FEEDS: NewsFeed[] = [
  { name: 'CNBC Markets', url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html' },
  { name: 'MarketWatch Real-time', url: 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines' },
  { name: 'MarketWatch Top Stories', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  { name: 'Investing.com', url: 'https://www.investing.com/rss/news_25.rss' },
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss' }, // crypto side of the universe
];

// Default single account for the embedded X timeline. StockTwits is native
// investing chatter rather than a general news outlet.
export const DEFAULT_X_HANDLE = 'StockTwits';

// A curated X List of investor accounts renders MANY voices in one timeline. Set
// the `news_x_list_url` setting (e.g. https://twitter.com/<user>/lists/<listId>)
// and it takes precedence over the single handle above.
export const DEFAULT_X_LIST_URL = '';

export function hostnameToName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Source';
  }
}
