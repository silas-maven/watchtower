import type { ReactNode } from 'react';

// The Portfolio section itself is open to everyone. Personal Finance and the two
// calculators are free (owner's instruction, 2 Aug 2026: the tools are lead
// generation, the signals are the product), so a section-wide gate here would
// wrongly lock them. Each members-only tool carries its own layout.tsx gate, and
// every tool API is gated independently, so nothing is reachable by URL alone.
export default function PortfolioToolsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
