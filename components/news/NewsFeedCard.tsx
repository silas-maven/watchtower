'use client';

import { useEffect, useState } from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';

type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  summary: string | null;
};

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NewsFeedCard() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/news', { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        if (json.ok) setItems(json.data.items);
        else setError(true);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    load();
    const interval = setInterval(load, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Markets &amp; finance news</span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Live feed</span>
      </div>

      <div className="max-h-[28rem] flex-1 overflow-y-auto">
        {error ? (
          <div className="p-5 text-sm text-muted-foreground">News is unavailable right now. It will refresh automatically.</div>
        ) : items == null ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-2 w-1/2 rounded bg-muted/60" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No headlines available.</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block px-5 py-3 transition hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-foreground/80">{item.source}</span>
                    <span>{timeAgo(item.publishedAt)}</span>
                  </div>
                  <div className="mt-1 flex items-start gap-1.5">
                    <span className="text-sm font-medium leading-snug text-foreground group-hover:text-primary">{item.title}</span>
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </div>
                  {item.summary && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.summary}</p>}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
