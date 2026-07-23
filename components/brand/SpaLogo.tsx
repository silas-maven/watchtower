// Stock Pickers Academy logo mark. A recreation of the academy's
// chart-with-arrow emblem as an inline SVG (gold tile, ascending bars and an
// up-trend arrow), themeable via the --primary / --primary-foreground vars.
//
// TEMPORARY: this is a close recreation. When the real brand logo file arrives,
// swap the <svg> body below (or render an <img>/imported SVG) and every
// placement updates at once.

export function SpaLogo({ className = 'h-10 w-10 rounded-xl', title = 'Stock Pickers Academy' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 40 40" role="img" aria-label={title} className={`shadow-md ${className}`}>
      <rect width="40" height="40" rx="9" fill="var(--primary)" />
      {/* Ascending bars */}
      <g fill="var(--primary-foreground)" opacity="0.9">
        <rect x="9" y="23" width="4" height="8" rx="1" />
        <rect x="16" y="19" width="4" height="12" rx="1" />
        <rect x="23" y="14" width="4" height="17" rx="1" />
      </g>
      {/* Up-trend arrow */}
      <path
        d="M9 25 L17 20 L23 22 L31 12"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M31 12 L31 17 M31 12 L26 12" fill="none" stroke="var(--primary-foreground)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
