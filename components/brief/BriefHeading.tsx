import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * A section heading inside the daily brief.
 *
 * Bold and in the foreground colour rather than small grey caps, because the
 * owner reads this panel as a document and asked for the headings to lead
 * (2 Aug 2026). When the section is members-only and the reader is not, the
 * heading carries "(members only)" and an upgrade button on the right, which is
 * exactly how he described it, and the section body is replaced rather than
 * left empty.
 */
export function BriefHeading({ children, locked = false }: { children: ReactNode; locked?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="text-sm font-bold text-foreground">
        {children}
        {locked && <span className="ml-1.5 font-semibold text-muted-foreground">(members only)</span>}
      </div>
      {locked && (
        <Link
          href="/pricing"
          className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground transition hover:brightness-110"
        >
          Upgrade to paid
        </Link>
      )}
    </div>
  );
}
