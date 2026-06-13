import { XMLParser } from 'fast-xml-parser';
import { DEFAULT_NEWS_FEEDS, hostnameToName, type NewsFeed } from '@/lib/news/sources';
import { getSetting } from '@/lib/server/settings';

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  summary: string | null;
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: ' - ',
  ndash: ' - ',
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

function stripHtml(input: string): string {
  return decodeEntities(input.replace(/<[^>]*>/g, ' '))
    // House style: no em or en dashes in member-facing copy.
    .replace(/\s*[—–]\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clamp(text: string, max = 200): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '#text' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)['#text'] ?? '');
  }
  return String(value);
}

function pickLink(entry: Record<string, unknown>): string {
  const link = entry.link;
  if (typeof link === 'string') return link;
  if (Array.isArray(link)) {
    const alt = link.find((l) => l?.['@_rel'] === 'alternate') ?? link[0];
    return asText(alt?.['@_href'] ?? alt);
  }
  if (link && typeof link === 'object') {
    return asText((link as Record<string, unknown>)['@_href'] ?? (link as Record<string, unknown>)['#text']);
  }
  return '';
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function parseFeed(xml: string, sourceName: string): NewsItem[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const rss = doc.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  const feed = doc.feed as Record<string, unknown> | undefined; // Atom

  const rawItems = channel ? toArray(channel.item) : feed ? toArray(feed.entry) : [];

  const items: NewsItem[] = [];
  for (const raw of rawItems as Record<string, unknown>[]) {
    const title = stripHtml(asText(raw.title));
    const url = pickLink(raw).trim();
    if (!title || !url) continue;

    const rawDate = asText(raw.pubDate) || asText(raw.published) || asText(raw.updated) || asText(raw['dc:date']);
    const parsedDate = rawDate ? new Date(rawDate) : null;
    const publishedAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null;

    const rawSummary = asText(raw.description) || asText(raw.summary) || asText(raw['content:encoded']);
    const summary = rawSummary ? clamp(stripHtml(rawSummary)) : null;

    items.push({ id: url, title, url, source: sourceName, publishedAt, summary });
  }
  return items.slice(0, 12);
}

async function fetchFeed(feed: NewsFeed): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      next: { revalidate: 600 },
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; SPA-News/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml, feed.name);
  } catch {
    return [];
  }
}

async function resolveFeeds(): Promise<NewsFeed[]> {
  try {
    const override = await getSetting('news_feed_urls');
    if (Array.isArray(override) && override.length > 0) {
      const defaultsByUrl = new Map(DEFAULT_NEWS_FEEDS.map((f) => [f.url, f.name]));
      return override
        .filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
        .map((url) => ({ url, name: defaultsByUrl.get(url) ?? hostnameToName(url) }));
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_NEWS_FEEDS;
}

export async function getFinanceNews(): Promise<NewsItem[]> {
  const feeds = await resolveFeeds();
  const results = await Promise.allSettled(feeds.map(fetchFeed));

  const all: NewsItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  // De-duplicate by URL and by near-identical title.
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of all) {
    const titleKey = item.title.toLowerCase().slice(0, 60);
    if (seenUrls.has(item.url) || seenTitles.has(titleKey)) continue;
    seenUrls.add(item.url);
    seenTitles.add(titleKey);
    deduped.push(item);
  }

  deduped.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });

  return deduped.slice(0, 40);
}
