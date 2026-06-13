'use client';

import { useSyncExternalStore } from 'react';
import { PanelRightClose, PanelRightOpen, Newspaper } from 'lucide-react';
import { NewsFeedCard } from '@/components/news/NewsFeedCard';
import { XTimelineCard } from '@/components/news/XTimelineCard';

const STORAGE_KEY = 'spa.marketPulse.collapsed';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('marketpulse-collapse', callback);
  return () => window.removeEventListener('marketpulse-collapse', callback);
}

// Persisted collapse state via useSyncExternalStore: server snapshot is false, so
// there is no hydration mismatch and no setState inside an effect.
function useCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY) === '1',
    () => false,
  );
  const toggle = () => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '0' : '1');
    window.dispatchEvent(new Event('marketpulse-collapse'));
  };
  return [collapsed, toggle];
}

export function MarketPulseRail({ xHandle }: { xHandle: string }) {
  const [collapsed, toggle] = useCollapsed();

  if (collapsed) {
    return (
      <div className="lg:sticky lg:top-6">
        <button
          onClick={toggle}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/40 lg:w-auto"
          aria-label="Show market pulse"
        >
          <span className="flex items-center gap-2"><Newspaper className="h-4 w-4 text-primary" /> Market Pulse</span>
          <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:sticky lg:top-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Market Pulse</h3>
        <button onClick={toggle} className="text-muted-foreground transition hover:text-foreground" aria-label="Collapse market pulse" title="Collapse">
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>
      <NewsFeedCard />
      <XTimelineCard handle={xHandle || 'MarketWatch'} />
    </div>
  );
}
