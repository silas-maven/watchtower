'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';

declare global {
  interface Window {
    twttr?: { widgets?: { load: (el?: HTMLElement) => void } };
  }
}

function ensureWidgetScript(onReady: () => void) {
  if (window.twttr?.widgets) {
    onReady();
    return;
  }
  const existing = document.getElementById('twitter-wjs') as HTMLScriptElement | null;
  if (existing) {
    existing.addEventListener('load', onReady, { once: true });
    return;
  }
  const script = document.createElement('script');
  script.id = 'twitter-wjs';
  script.src = 'https://platform.twitter.com/widgets.js';
  script.async = true;
  script.addEventListener('load', onReady, { once: true });
  document.body.appendChild(script);
}

export function XTimelineCard({ handle = 'MarketWatch' }: { handle?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    ensureWidgetScript(() => {
      if (cancelled) return;
      window.twttr?.widgets?.load(containerRef.current ?? undefined);
    });

    // If the embed has not rendered an iframe within 5s, show the fallback.
    const timer = setTimeout(() => {
      if (cancelled) return;
      const hasIframe = !!containerRef.current?.querySelector('iframe');
      if (hasIframe) setLoaded(true);
      else setFailed(true);
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [handle]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <span className="text-sm font-semibold text-foreground">On X</span>
        <a href={`https://twitter.com/${handle}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">
          @{handle}
        </a>
      </div>

      <div className="relative max-h-[28rem] flex-1 overflow-y-auto px-2 py-2">
        {failed && !loaded && (
          <div className="flex flex-col items-start gap-2 p-3 text-sm text-muted-foreground">
            <span>The X timeline could not load here.</span>
            <a
              href={`https://twitter.com/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              Open @{handle} on X <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
        <div ref={containerRef} aria-hidden={failed && !loaded}>
          <a className="twitter-timeline" data-theme="dark" data-dnt="true" data-chrome="noheader nofooter transparent" data-height="440" href={`https://twitter.com/${handle}`}>
            Posts by @{handle}
          </a>
        </div>
      </div>
    </div>
  );
}
