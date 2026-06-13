'use client';

import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';

// The WebGL canvas is loaded client-only and behind the hero content, so the
// headline and CTAs paint immediately and the canvas never blocks LCP.
const HeroCanvas = dynamic(() => import('@/components/marketing/HeroCanvas'), {
  ssr: false,
  loading: () => null,
});

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false, // server snapshot
  );
}

export function HeroBackground() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Static gradient is always present and also backs the reduced-motion fallback. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(202,138,4,0.14),_transparent_60%)]" />
      <HeroCanvas reducedMotion={reducedMotion} />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
