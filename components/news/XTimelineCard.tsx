'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
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
  const { resolvedTheme } = useTheme();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !resolvedTheme) return;
    let cancelled = false;

    // The widget bakes data-theme in at load time, so a light/dark switch needs
    // a fresh anchor. Rebuild the embed whenever the resolved theme changes.
    container.innerHTML = '';
    const anchor = document.createElement('a');
    anchor.className = 'twitter-timeline';
    anchor.setAttribute('data-theme', resolvedTheme === 'light' ? 'light' : 'dark');
    anchor.setAttribute('data-dnt', 'true');
    anchor.setAttribute('data-chrome', 'noheader nofooter transparent');
    anchor.setAttribute('data-height', '440');
    anchor.href = `https://twitter.com/${handle}`;
    anchor.textContent = `Posts by @${handle}`;
    container.appendChild(anchor);

    ensureWidgetScript(() => {
      if (cancelled) return;
      window.twttr?.widgets?.load(container);
    });

    // If the embed has not rendered an iframe within 5s, show the fallback.
    // Setting the boolean here (only inside this async callback) also clears a
    // prior failure when a theme-driven rebuild succeeds.
    const timer = setTimeout(() => {
      if (cancelled) return;
      setFailed(!container.querySelector('iframe'));
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [handle, resolvedTheme]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <span className="text-sm font-semibold text-foreground">On X</span>
        <a href={`https://twitter.com/${handle}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">
          @{handle}
        </a>
      </div>

      {/* The Twitter iframe (data-height=440) owns its own scroll, so the card
          itself does not scroll — this avoids the double scrollbar. */}
      <div className="px-2 py-2">
        {failed && (
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
        <div ref={containerRef} className={failed ? 'hidden' : ''} />
      </div>
    </div>
  );
}
