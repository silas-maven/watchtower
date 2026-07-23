import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="relative z-10 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/spa-logo.svg" alt="Stock Pickers Academy" className="h-9 w-9" />
          <div className="text-sm text-muted-foreground">Stock Pickers Academy</div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/pricing" className="transition hover:text-foreground">Pricing</Link>
          <Link href="/sign-in" className="transition hover:text-foreground">Member sign in</Link>
          <span>© {new Date().getFullYear()} Stock Pickers Academy</span>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 pb-8">
        <p className="text-xs leading-5 text-muted-foreground/70">
          For education and information only. Nothing here is financial advice or a recommendation to buy or sell any security. Markets carry risk and you can lose money. Always do your own research.
        </p>
      </div>
    </footer>
  );
}
