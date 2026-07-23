import { SpaEmblem } from '@/components/brand/SpaLogo';

// Full logo lockup (emblem + wordmark). On the landing hero, `animated` makes
// the bars rise, the arrow draw itself in, and the wordmark fade up. All motion
// is gated behind prefers-reduced-motion (reduced motion shows the static logo).

export function SpaLogoLockup({ animated = false, className = '' }: { animated?: boolean; className?: string }) {
  return (
    <div className={`${animated ? 'spa-anim ' : ''}flex flex-col items-center ${className}`}>
      <SpaEmblem animated={animated} className="h-28 w-auto md:h-36" />
      <div className="mt-3 text-center">
        <div className="spa-word text-3xl font-black tracking-tight text-foreground md:text-4xl" style={animated ? { animationDelay: '1.35s' } : undefined}>
          STOCK PICKERS
        </div>
        <div className="spa-word mt-1 text-sm font-semibold uppercase tracking-[0.42em] text-muted-foreground md:text-base" style={animated ? { animationDelay: '1.5s' } : undefined}>
          Academy
        </div>
      </div>
    </div>
  );
}
