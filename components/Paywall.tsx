import Link from 'next/link';
import { Lock } from 'lucide-react';

// Server-rendered upgrade gate. Shown in place of a members-only surface when a
// FREE-tier profile reaches it. This is the visible half of the paywall; the
// hard half is the server-side entitlement check that renders it (and the API
// routes that return 402), so a free user never receives the gated data.
export function Paywall({
  title = 'A members feature',
  message = 'This is part of the paid Stock Pickers Academy membership.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-6 w-6" />
      </div>
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link
          href="/pricing"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110"
        >
          See membership
        </Link>
        <Link
          href="/app"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
