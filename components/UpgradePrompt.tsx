import Link from 'next/link';
import { Lock } from 'lucide-react';
import { MEMBER_FEATURES, type MemberFeature } from '@/lib/memberFeatures';

/**
 * The in-place upgrade prompt: shown where a members-only surface would have
 * been, without taking over the whole page. Use this when the rest of the page
 * is legitimately free (an asset still shows its price and history to everyone);
 * use <Paywall> when the entire route is members-only.
 *
 * The copy comes from MEMBER_FEATURES rather than the call site, deliberately.
 * The academy treats the indicator set as proprietary and no message a
 * non-paying member can read may name the individual indicators, which is only
 * enforceable if there is one place the messages are written.
 *
 * Safe in client components: it reads a plain constant and renders a link.
 */
export function UpgradePrompt({
  feature,
  compact = false,
  className = '',
}: {
  feature: MemberFeature;
  compact?: boolean;
  className?: string;
}) {
  const { title, message } = MEMBER_FEATURES[feature];

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 ${className}`}>
        <Lock className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <Link href="/pricing" className="ml-auto text-sm font-bold text-primary transition hover:underline">
          Upgrade to paid
        </Link>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-border bg-muted/20 p-8 text-center ${className}`}>
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-5 w-5" />
      </div>
      <div className="font-bold text-foreground">{title}</div>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
      <Link
        href="/pricing"
        className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110"
      >
        Upgrade to paid
      </Link>
    </div>
  );
}

/**
 * The inline stand-in for a single withheld value, sized to sit in a table cell
 * where a signal badge would be. Deliberately says nothing about what the signal
 * would have been.
 */
export function LockedValue({ label = 'Members', href = '/pricing' }: { label?: string; href?: string }) {
  return (
    <Link
      href={href}
      title="Buy and sell signals come with the paid membership"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground transition hover:border-primary/40 hover:text-primary"
    >
      <Lock className="h-2.5 w-2.5" />
      {label}
    </Link>
  );
}
