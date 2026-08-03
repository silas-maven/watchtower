'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessagesSquare } from 'lucide-react';
import { FEATURED_ROTATE_MS } from '@/lib/community';

export type FeaturedItem = { id: string; alias: string; body: string; createdAt: string };

/**
 * The rotating community slot on the Dashboard: one post at a time, changing
 * every five seconds, as the owner asked.
 *
 * A five second auto-advance is hostile to anyone reading slowly, so it stops
 * whenever stopping is the kind thing to do: on hover, on keyboard focus, and
 * when the tab is in the background. Anyone who has asked their system for
 * reduced motion gets the newest post and no rotation at all.
 */
export function FeaturedPost({ items }: { items: FeaturedItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (items.length <= 1 || paused || reduced.current) return;
    const timer = window.setInterval(() => {
      // Visibility is read here rather than mirrored into state. A tab that was
      // already in the background when this mounted is just as common as one
      // that goes there later (the Dashboard often loads in a tab the member is
      // not looking at yet), and checking on the tick covers both without a
      // listener or an effect that sets state.
      if (document.hidden) return;
      setIndex((i) => (i + 1) % items.length);
    }, FEATURED_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  if (items.length === 0) return null;
  const item = items[Math.min(index, items.length - 1)];

  return (
    <div
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
          <MessagesSquare className="h-3.5 w-3.5" /> From the community
        </div>
        <Link href="/app/community" className="text-xs font-semibold text-primary hover:underline">
          Open the feed
        </Link>
      </div>

      {/* aria-live so a screen reader is told when the post changes underneath
          it, rather than silently reading something that is no longer there. */}
      <div aria-live="polite" className="mt-3 min-h-[3.5rem]">
        <p className="line-clamp-3 text-sm leading-6 text-foreground">{item.body}</p>
        <div className="mt-2 text-xs font-semibold text-muted-foreground">{item.alias}</div>
      </div>

      {items.length > 1 && (
        <div className="mt-3 flex gap-1.5">
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={() => setIndex(i)}
              aria-label={`Show post ${i + 1} of ${items.length}`}
              className={`h-1 flex-1 rounded-full transition ${i === index ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
