// Stock Pickers Academy logo, recreated as inline SVG from the brand artwork:
// a green up-trend arrow over a row of gold-to-green candlestick bars. Scalable
// and animatable (see SpaLogoLockup). Swap the artwork here if the vector file
// ever changes; every placement updates at once.

type Bar = { x: number; h: number };

// baseline y = 180; bars grow upward. Heights mirror the artwork's rising chart.
const BARS: Bar[] = [
  { x: 18, h: 58 },
  { x: 46, h: 84 },
  { x: 74, h: 116 },
  { x: 102, h: 100 },
  { x: 130, h: 128 },
  { x: 158, h: 116 },
  { x: 186, h: 146 },
  { x: 214, h: 122 },
];
const BAR_W = 16;
const BASE = 180;

/**
 * The logo emblem (arrow + bars). `animated` adds the classes the landing
 * lockup animates; on its own it renders static, for nav/footer chips.
 */
export function SpaEmblem({ animated = false, className }: { animated?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 248 196" role="img" aria-label="Stock Pickers Academy" className={className}>
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

      {/* Up-trend arrow shaft */}
      <path
        className={animated ? 'spa-arrow' : undefined}
        pathLength={1}
        d="M24 120 L74 78 L110 96 L150 66 L206 40"
        fill="none"
        stroke="url(#spaArrow)"
        strokeWidth={13}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrowhead corner at the tip */}
      <path
        className={animated ? 'spa-arrowhead' : undefined}
        d="M206 62 L206 40 L184 40"
        fill="none"
        stroke="url(#spaArrow)"
        strokeWidth={13}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Compact logo mark for headers, nav and footers. */
export function SpaLogo({ className = 'h-10 w-10' }: { className?: string }) {
  return <SpaEmblem className={className} />;
}
