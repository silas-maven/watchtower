'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

type Settings = {
  news_feed_urls?: string[];
  news_x_handle?: string;
  news_x_list_url?: string;
};

function linesToUrls(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function NewsSourceSettingsPanel() {
  const { pushToast } = useToast();
  const [feedUrls, setFeedUrls] = useState('');
  const [xHandle, setXHandle] = useState('StockTwits');
  const [xListUrl, setXListUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((response) => response.json())
      .then((json) => {
        if (!json.ok) return;
        const settings = (json.data?.settings ?? {}) as Settings;
        setFeedUrls(Array.isArray(settings.news_feed_urls) ? settings.news_feed_urls.join('\n') : '');
        setXHandle(settings.news_x_handle || 'StockTwits');
        setXListUrl(settings.news_x_list_url || '');
      })
      .finally(() => setLoaded(true));
  }, []);

  async function save(key: 'news_feed_urls' | 'news_x_handle' | 'news_x_list_url', value: string | string[]) {
    setSaving(key);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      const json = await response.json();
      pushToast(json.ok ? 'News source setting saved.' : (json.error?.message ?? 'Could not save'), json.ok ? 'success' : 'error');
    } catch {
      pushToast('Could not save news source setting.', 'error');
    } finally {
      setSaving(null);
    }
  }

  if (!loaded) return <div className="text-sm text-muted-foreground">Loading news sources…</div>;

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-xs leading-5 text-muted-foreground">
        The member Market Pulse uses the investing-focused defaults until you save one or more RSS URLs here. Use only sources you have reviewed. A curated X List takes precedence over the single X account.
      </p>

      <div>
        <label htmlFor="news-feed-urls" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">RSS feed URLs</label>
        <textarea
          id="news-feed-urls"
          value={feedUrls}
          onChange={(event) => setFeedUrls(event.target.value)}
          rows={6}
          placeholder={'One HTTPS RSS URL per line\nLeave empty to use the Academy defaults'}
          className="mt-1 block w-full max-w-3xl rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
        />
        <div className="mt-1 text-xs text-muted-foreground">Saving an empty list restores CNBC, MarketWatch, Investing.com and Cointelegraph defaults.</div>
        <button
          onClick={() => save('news_feed_urls', linesToUrls(feedUrls))}
          disabled={saving !== null}
          className="mt-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {saving === 'news_feed_urls' ? 'Saving…' : 'Save RSS sources'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:items-end">
        <div>
          <label htmlFor="news-x-handle" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">X account</label>
          <input
            id="news-x-handle"
            value={xHandle}
            onChange={(event) => setXHandle(event.target.value)}
            placeholder="StockTwits"
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <button
            onClick={() => save('news_x_handle', xHandle.trim())}
            disabled={saving !== null}
            className="mt-2 rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
          >
            {saving === 'news_x_handle' ? 'Saving…' : 'Save X account'}
          </button>
        </div>
        <div>
          <label htmlFor="news-x-list" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Curated X List URL (optional)</label>
          <input
            id="news-x-list"
            value={xListUrl}
            onChange={(event) => setXListUrl(event.target.value)}
            placeholder="https://x.com/your-account/lists/123456789"
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <div className="mt-1 text-xs text-muted-foreground">Leave blank to show the single account. Use an approved, public investing list only.</div>
          <button
            onClick={() => save('news_x_list_url', xListUrl.trim())}
            disabled={saving !== null}
            className="mt-2 rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
          >
            {saving === 'news_x_list_url' ? 'Saving…' : 'Save X List'}
          </button>
        </div>
      </div>
    </div>
  );
}
