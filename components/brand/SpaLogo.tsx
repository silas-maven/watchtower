// Stock Pickers Academy logo, recreated as inline SVG from the brand artwork:
// a green up-trend arrow over a row of gold-to-green candlestick bars. Scalable
// and animatable (see SpaLogoLockup). Swap the artwork here if the vector file
// ever changes; every placement updates at once.

type Bar = { x: number; h: number };

// The candlesticks trace the arrow: each bar's top sits a fixed gap below the
// arrow line at its x, so tall bars fall under the arrow's peaks and short bars
// under its dip. baseline y = 150; bars grow upward.
const BARS: Bar[] = [
  { x: 24, h: 52 },
  { x: 56, h: 76 },
  { x: 88, h: 100 }, // under the arrow's first peak
  { x: 120, h: 74 }, // under the dip
  { x: 152, h: 88 },
  { x: 184, h: 102 },
  { x: 216, h: 116 }, // under the arrowhead
];
const BAR_W = 14;
const BASE = 150;

/**
 * The logo emblem (arrow + bars). `animated` adds the classes the landing
 * lockup animates; on its own it renders static, for nav/footer chips.
 */
export function SpaEmblem({ animated = false, className }: { animated?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 248 160" role="img" aria-label="Stock Pickers Academy" className={className}>
      <defs>
        <linearGradient id="spaBars" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7a5320" />
          <stop offset="22%" stopColor="#b98f3e" />
          <stop offset="44%" stopColor="#e6d689" />
          <stop offset="60%" stopColor="#ece49c" />
          <stop offset="80%" stopColor="#b3a648" />
          <stop offset="100%" stopColor="#5c9e46" />
        </linearGradient>
        <linearGradient id="spaArrow" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#2f7d32" />
          <stop offset="100%" stopColor="#84d17c" />
        </linearGradient>
      </defs>

      {BARS.map((b, i) => (
        <rect
          key={i}
          className={animated ? 'spa-bar' : undefined}
          style={animated ? { animationDelay: `${i * 0.07}s` } : undefined}
          x={b.x}
          y={BASE - b.h}
          width={BAR_W}
          height={b.h}
          rx={6}
          fill="url(#spaBars)"
        />
      ))}

      {/* Up-trend arrow, floating above the candlesticks and tracing their shape:
          up to a peak (over bar 3), a dip (over bar 4), then a rise to the head */}
      <path
        className={animated ? 'spa-arrow' : undefined}
        pathLength={1}
        d="M28 82 L95 34 L127 60 L210 24"
        fill="none"
        stroke="url(#spaArrow)"
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Filled arrowhead at the top-right tip, pointing up and to the right */}
      <path
        className={animated ? 'spa-arrowhead' : undefined}
        d="M232 14 L214 34 L204 13 Z"
        fill="url(#spaArrow)"
        stroke="url(#spaArrow)"
        strokeWidth={4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Compact logo mark for headers, nav and footers. */
export function SpaLogo({ className = 'h-10 w-10' }: { className?: string }) {
  return <SpaEmblem className={className} />;
}
